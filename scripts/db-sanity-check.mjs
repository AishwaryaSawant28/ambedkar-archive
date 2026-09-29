#!/usr/bin/env node
/**
 * Read-only database sanity check for the Digital Heritage Archive.
 *
 * Verifies (without writing anything):
 *  - real archival documents exist and how many have ingested content
 *  - document_chunks rows and non-null embeddings exist
 *  - timeline_events / media / collections row counts
 *  - no duplicate source_url records were recreated
 *
 * Uses the publishable key only (read paths allowed by RLS).
 * Usage: node scripts/db-sanity-check.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const count = async (table) => {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
  if (error) return { error: error.message };
  return { count };
};

const main = async () => {
  console.log("== Database sanity check (read-only) ==\n");

  const [docs, chunks, embedded, timeline, media, collections] = await Promise.all([
    count("documents"),
    count("document_chunks"),
    db.from("document_chunks").select("id", { count: "exact", head: true }).not("embedding", "is", null),
    count("timeline_events"),
    count("media"),
    count("collections"),
  ]);

  console.log(`documents        : ${docs.error ? "ERROR " + docs.error : docs.count}`);
  console.log(`document_chunks  : ${chunks.error ? "ERROR " + chunks.error : chunks.count}`);
  console.log(`  with embedding : ${embedded.error ? "ERROR " + embedded.error : embedded.count}`);
  console.log(`timeline_events  : ${timeline.error ? "ERROR " + timeline.error : timeline.count}`);
  console.log(`media            : ${media.error ? "ERROR " + media.error : media.count}`);
  console.log(`collections      : ${collections.error ? "ERROR " + collections.error : collections.count}`);

  const { data: docRows, error: docErr } = await db
    .from("documents")
    .select("id, title, source_url, content, ocr_status");
  if (docErr) {
    console.error("\nFailed to list documents:", docErr.message);
    process.exit(1);
  }

  console.log("\n-- Documents --");
  const seen = new Map();
  let dupes = 0;
  let withContent = 0;
  for (const d of docRows ?? []) {
    const len = d.content ? d.content.length : 0;
    if (len > 0) withContent += 1;
    const dupeOf = seen.get(d.source_url);
    if (dupeOf) {
      dupes += 1;
      console.log(`  ! DUPLICATE source_url: "${d.title}" duplicates "${dupeOf}"`);
    } else {
      seen.set(d.source_url, d.title);
    }
    console.log(
      `  - ${d.title} | content: ${len ? len.toLocaleString() + " chars" : "empty"} | ocr: ${d.ocr_status ?? "—"}`
    );
  }
  console.log(`\nDocuments with ingested content: ${withContent}/${(docRows ?? []).length}`);
  console.log(`Duplicate source_url records   : ${dupes}`);

  const { data: tlRows, error: tlErr } = await db
    .from("timeline_events")
    .select("year, title, category")
    .order("year", { ascending: true });
  if (tlErr) {
    console.error("Failed to list timeline events:", tlErr.message);
  } else {
    console.log("\n-- Timeline events --");
    for (const e of tlRows ?? []) console.log(`  - ${e.year} | ${e.title} [${e.category ?? "—"}]`);
  }

  console.log("\nDone. No writes were performed.");
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
