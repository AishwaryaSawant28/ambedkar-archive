/**
 * Shared server-side ingestion logic.
 *
 * Fetches a document's official source page, extracts the readable archival
 * text (dropping navigation, scripts, styles and page chrome), updates
 * `documents.content` / `documents.summary`, then chunks, embeds and replaces
 * the document's rows in `document_chunks`.
 *
 * Never fabricates text: if extraction fails or yields too little text, the
 * document's content is left unchanged.
 *
 * Ingestion intentionally goes through the server admin client
 * (SUPABASE_SECRET_KEY) so it works regardless of public RLS read policies.
 */
import "server-only";

import { getAdminClient } from "./admin";
import { embedText } from "./embeddings";
import { chunkText } from "@/lib/chunking";
import type { SupabaseDocument } from "@/lib/documents";

const FETCH_TIMEOUT_MS = 45_000;
const FETCH_RETRY_ATTEMPTS = 3;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 digital-heritage-archive-ingest/1.0";

function decodeEntities(raw: string): string {
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

function htmlToText(raw: string): string {
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
function extractGeneric(html: string): string {
  const main =
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ??
    html;
  return htmlToText(main).slice(0, 200_000);
}

/**
 * constitutionofindia.net debate pages structure each speech as a grid row
 * with an optional volume reference span, a speaker span, and a prose div.
 * Returns null when the page does not match this structure.
 */
function extractDebate(html: string): string | null {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) return null;

  const rowRe =
    /<div class="lg:grid lg:grid-cols-12[^"]*"[^>]*>([\s\S]*?)(?=<div class="lg:grid lg:grid-cols-12|<div class="a2a|<\/main|$)/g;

  const blocks: { speaker: string | null; volRef: string | null; text: string }[] = [];
  let m: RegExpExecArray | null;
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
    blocks.push({ speaker, volRef, text });
  }

  if (blocks.length === 0) return null;

  const lines: string[] = [];
  for (const b of blocks) {
    lines.push(
      b.speaker
        ? `${b.speaker}${b.volRef ? ` [CAD Vol. ref ${b.volRef}]` : ""}:\n\n${b.text}`
        : b.text
    );
  }
  return lines.join("\n\n");
}

async function fetchPage(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < FETCH_RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status === 200) return await res.text();
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 1200 + attempt * 1200));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Build a concise factual summary from the extracted session record. */
function buildSummary(text: string): string | null {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const sessionPara =
    paras.find((p) => /met in the Constitution Hall|Assembled|in the Chair/i.test(p)) ??
    paras[0] ??
    null;
  return sessionPara ? sessionPara.slice(0, 400) : null;
}

export interface IngestResult {
  ok: boolean;
  message: string;
  extractedChars?: number;
  chunkCount?: number;
}

/**
 * Ingest one document: fetch its source page, store extracted text and
 * summary, then rebuild its embedding chunks. Idempotent — re-running
 * replaces previous chunks instead of duplicating them.
 */
export async function ingestDocument(
  doc: Pick<SupabaseDocument, "id" | "title" | "date" | "source_url">
): Promise<IngestResult> {
  if (!doc.source_url) {
    return { ok: false, message: "No source_url recorded for this document." };
  }

  const admin = getAdminClient();

  let html: string;
  try {
    html = await fetchPage(doc.source_url);
  } catch (err) {
    console.error(`[ingest] fetch failed for ${doc.id}:`, err);
    return { ok: false, message: "Could not fetch the source page." };
  }

  const text = extractDebate(html) ?? extractGeneric(html);
  if (!text || text.length < 200) {
    return {
      ok: false,
      message: "Extraction produced too little text; content left unchanged.",
    };
  }

  const summary = buildSummary(text);

  const { error: updateError } = await admin
    .from("documents")
    .update({ content: text, summary, ocr_status: "processed" })
    .eq("id", doc.id);
  if (updateError) {
    console.error(`[ingest] document update failed for ${doc.id}:`, updateError.message);
    return { ok: false, message: "Database update failed." };
  }

  // Rebuild chunks + embeddings.
  const chunks = chunkText(text);
  const del = await admin.from("document_chunks").delete().eq("document_id", doc.id);
  if (del.error) {
    console.error(`[ingest] chunk delete failed for ${doc.id}:`, del.error.message);
    return { ok: false, message: "Chunk reset failed.", extractedChars: text.length };
  }

  let inserted = 0;
  for (let i = 0; i < chunks.length; i++) {
    let embedding: number[];
    try {
      embedding = await embedText(chunks[i].text);
    } catch (err) {
      console.error(`[ingest] embedding failed for ${doc.id} chunk ${i}:`, err);
      break;
    }
    const ins = await admin.from("document_chunks").insert({
      document_id: doc.id,
      chunk_text: chunks[i].text,
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
      console.error(`[ingest] chunk insert failed for ${doc.id} #${i}:`, ins.error.message);
      break;
    }
    inserted += 1;
  }

  return {
    ok: true,
    message: `Ingested ${text.length} characters into ${inserted} chunks.`,
    extractedChars: text.length,
    chunkCount: inserted,
  };
}

/** Ingest every document that has a source_url. */
export async function ingestAllDocuments(): Promise<{
  updated: number;
  failed: number;
  skipped: number;
  details: { id: string; title: string; ok: boolean; message: string }[];
}> {
  const admin = getAdminClient();
  const { data: docs, error } = await admin
    .from("documents")
    .select("id, title, date, source_url")
    .order("date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const details: { id: string; title: string; ok: boolean; message: string }[] = [];
  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const doc of docs ?? []) {
    if (!doc.source_url) {
      skipped += 1;
      details.push({ id: doc.id, title: doc.title, ok: false, message: "No source_url." });
      continue;
    }
    const result = await ingestDocument(doc);
    if (result.ok) updated += 1;
    else failed += 1;
    details.push({ id: doc.id, title: doc.title, ok: result.ok, message: result.message });
    await new Promise((r) => setTimeout(r, 1200));
  }

  return { updated, failed, skipped, details };
}
