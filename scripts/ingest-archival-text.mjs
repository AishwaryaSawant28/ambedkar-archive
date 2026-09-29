#!/usr/bin/env node
/**
 * One-time server-side ingestion for the Digital Heritage Archive.
 *
 * 1. Reads every `documents` row that has a source_url.
 * 2. Fetches the official source page (constitutionofindia.net).
 * 3. Extracts the readable debate text (structured speech rows), dropping all
 *    navigation, scripts, styles and page chrome.
 * 4. Writes extracted text to `documents.content` and a factual session
 *    summary to `documents.summary`. Never invents text on failure.
 * 5. Chunks the text, embeds with Xenova/miniLM-L6-v2 (384 dims, matching the
 *    existing vector(384) schema) and replaces the document's rows in
 *    `document_chunks` (idempotent — no duplicate chunks on re-runs).
 *
 * Security: SUPABASE_SECRET_KEY is read from .env.local server-side only.
 *
 * Usage:
 *   node scripts/ingest-archival-text.mjs                 # full run
 *   node scripts/ingest-archival-text.mjs --skip-existing # only empty content
 *   node scripts/ingest-archival-text.mjs --no-embed      # text only, skip embeddings
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

/* ---------------- env ---------------- */

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SECRET) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

// Writes go through the privileged admin client (SUPABASE_SECRET_KEY) so
// ingestion works regardless of public RLS read policies. The secret key
// stays server-side and is never shipped to the browser.
const admin = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } });
const db = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
const writeClient = admin;

const SKIP_EXISTING = process.argv.includes("--skip-existing");
const NO_EMBED = process.argv.includes("--no-embed");
const FETCH_DELAY_MS = 1500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- html -> text ---------------- */

function decodeEntities(raw) {
  return raw
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&rsquor;/g, "\u2019")
    .replace(/&ldquo;|&rdquo;/g, "\u201C")
    .replace(/&Gt;/g, ">");
}

function htmlToText(raw) {
  return decodeEntities(
    raw
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Plain-text fallback for arbitrary source pages. */
function extractGeneric(html) {
  const main =
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ??
    html;
  return htmlToText(main).slice(0, 200000);
}

/**
 * constitutionofindia.net debate pages: speech rows are
 * <div class="lg:grid lg:grid-cols-12 ..." id="NNNN">
 *   <span class="... bg-[#F8FFA3]">9.113.2</span>              (volume ref)
 *   <span class="... md:text-lg font-medium">B. R. Ambedkar</span> (speaker)
 *   <div class="... prose ... content"><p>speech text</p></div>
 * Returns null when the page does not match this structure.
 */
function extractDebate(html) {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) return null;
  const rowRe = /<div class="lg:grid lg:grid-cols-12[^"]*"[^>]*>([\s\S]*?)(?=<div class="lg:grid lg:grid-cols-12|<div class="a2a|<\/main|$)/g;
  const blocks = [];
  let m;
  while ((m = rowRe.exec(main)) !== null) {
    const seg = m[1];
    const spans = [...seg.matchAll(/<span class="([^"]*)"[^>]*>\s*([^<]{1,80})\s*<\/span>/g)].map(
      (x) => ({ cls: x[1], txt: x[2].trim() })
    );
    const volRef = spans.find((s) => /^[\d.]+$/.test(s.txt))?.txt ?? null;
    const speaker =
      spans.find(
        (s) =>
          s.txt.length > 2 &&
          !/^[\d.]+$/.test(s.txt) &&
          !/Home|Debates|Volume|Assembly|Download|Share/i.test(s.txt)
      )?.txt ?? null;
    const body = seg.match(
      /<div class="[^"]*prose[^"]*content"[^>]*>([\s\S]*?)(?=<div class="lg:grid|<div class="a2a|$)/
    )?.[1];
    if (!body) continue;
    const text = htmlToText(body);
    if (text.length < 2) continue;
    blocks.push({ volRef, speaker, text });
  }
  if (blocks.length === 0) return null;
  const lines = [];
  for (const b of blocks) {
    if (b.speaker) {
      lines.push(`${b.speaker}${b.volRef ? ` [CAD Vol. ref ${b.volRef}]` : ""}:\n\n${b.text}`);
    } else {
      lines.push(b.text);
    }
  }
  return lines.join("\n\n");
}

/* ---------------- chunking ---------------- */

function chunkText(text, maxLen = 1200) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const para of paragraphs) {
    if (para.length > maxLen * 2) {
      if (current) { chunks.push(current); current = ""; }
      const sentences = para.match(/[^.!?]+[.!?]*\s*/g) ?? [para];
      for (const sentence of sentences) {
        if ((current + sentence).length > maxLen) {
          if (current) chunks.push(current);
          current = sentence;
        } else {
          current += sentence;
        }
      }
      continue;
    }
    if ((current + "\n\n" + para).length > maxLen) {
      if (current) chunks.push(current);
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((c) => c.trim().length > 0);
}

/* ---------------- embeddings (lazy, cached) ---------------- */

let extractor = null;
async function getExtractor() {
  if (!extractor) {
    const { pipeline } = await import("@xenova/transformers");
    console.log("Loading embedding model Xenova/all-MiniLM-L6-v2 (384 dims)…");
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("Model ready.");
  }
  return extractor;
}

async function embed(text) {
  const model = await getExtractor();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

/* ---------------- fetching ---------------- */

async function fetchWithRetry(url, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 digital-heritage-archive-ingest/1.0",
        },
        signal: AbortSignal.timeout(45000),
      });
      if (res.status === 200) return await res.text();
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await sleep(1500 + i * 1500);
  }
  throw lastErr;
}

/* ---------------- main ---------------- */

async function main() {
  const { data: docs, error } = await db
    .from("documents")
    .select("id, title, date, source_url, content, summary")
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to list documents:", error.message);
    process.exit(1);
  }

  console.log(`Found ${docs.length} documents.`);
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    if (!doc.source_url) {
      console.log(`- ${doc.title}: no source_url, skipping.`);
      skipped += 1;
      continue;
    }
    if (SKIP_EXISTING && doc.content && doc.content.length > 400) {
      console.log(`- ${doc.title}: already ingested, skipping.`);
      skipped += 1;
      continue;
    }

    console.log(`\n== ${doc.title}`);
    console.log(`   ${doc.source_url}`);
    try {
      const html = await fetchWithRetry(doc.source_url);
      const text = extractDebate(html) ?? extractGeneric(html);
      if (!text || text.length < 200) {
        console.log("   ! extraction produced too little text — content left unchanged");
        failed += 1;
        continue;
      }
      console.log(`   extracted ${text.length} chars`);

      // Concise factual summary from the session's own opening record.
      const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
      const sessionPara =
        paras.find((p) => /met in the Constitution Hall|Assembled|in the Chair/i.test(p)) ??
        paras[0] ??
        null;
      const summary = sessionPara ? sessionPara.slice(0, 400) : null;
      console.log(`   summary: ${summary ? summary.slice(0, 90) + "…" : "(none)"}`);

      const { error: upErr } = await writeClient
        .from("documents")
        .update({ content: text, summary, ocr_status: "processed" })
        .eq("id", doc.id);
      if (upErr) {
        console.error("   ! document update failed:", upErr.message);
        failed += 1;
        continue;
      }

      if (!NO_EMBED) {
        const chunks = chunkText(text);
        console.log(`   ${chunks.length} chunks to embed…`);
        // Idempotent: replace previous chunks for this document.
        const del = await writeClient.from("document_chunks").delete().eq("document_id", doc.id);
        if (del.error) console.error("   ! chunk delete warning:", del.error.message);
        for (let i = 0; i < chunks.length; i++) {
          const embedding = await embed(chunks[i]);
          const ins = await writeClient.from("document_chunks").insert({
            document_id: doc.id,
            chunk_text: chunks[i],
            page_number: null,
            metadata: {
              chunk_index: i,
              chunk_count: chunks.length,
              document_title: doc.title,
              document_date: doc.date,
              source_url: doc.source_url,
            },
            embedding,
          });
          if (ins.error) {
            console.error(`   ! chunk ${i} insert failed:`, ins.error.message);
            break;
          }
          if ((i + 1) % 20 === 0) console.log(`   embedded ${i + 1}/${chunks.length}`);
        }
      }

      updated += 1;
      await sleep(FETCH_DELAY_MS);
    } catch (e) {
      console.error("   ! failed:", e.message);
      failed += 1;
      await sleep(2000);
    }
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} failed=${failed}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
