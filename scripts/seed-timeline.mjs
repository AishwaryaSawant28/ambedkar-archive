#!/usr/bin/env node
/**
 * Seed factual timeline milestones into `timeline_events`.
 *
 * - Uses the admin client (SUPABASE_SECRET_KEY) — server-side only.
 * - Idempotent: refuses to run when rows already exist unless --force
 *   (--force deletes existing timeline_events rows first; it never touches
 *   documents, document_chunks, media or collections).
 * - No invented dates, quotes or image URLs. Images are the project's own
 *   local archival-motif placeholders under /images/tl-*.svg.
 *
 * Sources (Ministry-provided Ambedkar resources timeline and the archive's
 * own Constituent Assembly records):
 *   - ambedkarresources.dbmeics.gov.in (Ministry of Social Justice & Empowerment)
 *   - constitutionofindia.net/debates/26-nov-1949/ (adoption session)
 *
 * Usage: node scripts/seed-timeline.mjs [--force]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;
if (!URL || !SECRET) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const admin = createClient(URL, SECRET, { auth: { persistSession: false } });

/** category values double as the UI era-filter keys in components/timeline.tsx */
const EVENTS = [
  {
    year: 1891,
    date: "14 April 1891",
    title: "Birth in Mhow",
    description:
      "Bhimrao Ramji Ambedkar was born at Mhow in present-day Madhya Pradesh.",
    category: "early-life",
    image_url: "/images/tl-1891.svg",
  },
  {
    year: 1916,
    date: "June 1916",
    title: "Doctorate at Columbia University",
    description:
      "Completed his Ph.D. in economics at Columbia University, New York, after studies that marked the start of his public intellectual career.",
    category: "education",
    image_url: "/images/tl-1916.svg",
  },
  {
    year: 1927,
    date: "25 December 1927",
    title: "Mahad Satyagraha",
    description:
      "Led the satyagraha at Mahad asserting the right of the depressed classes to take water from public tanks.",
    category: "movement",
    image_url: "/images/tl-1927.svg",
  },
  {
    year: 1932,
    date: "24 September 1932",
    title: "Poona Pact",
    description:
      "Signed the Poona Pact with M. K. Gandhi, replacing separate electorates with reserved seats for the depressed classes in the legislatures.",
    category: "movement",
    image_url: null,
  },
  {
    year: 1947,
    date: "29 August 1947",
    title: "Chairman of the Drafting Committee",
    description:
      "Appointed Chairman of the Drafting Committee of the Constitution of India by the Constituent Assembly.",
    category: "constitution",
    image_url: "/images/tl-1947.svg",
  },
  {
    year: 1948,
    date: "4 November 1948",
    title: "Draft Constitution presented",
    description:
      "Presented the Draft Constitution to the Constituent Assembly, opening its clause-by-clause consideration.",
    category: "constitution",
    image_url: "/images/tl-1948.svg",
  },
  {
    year: 1949,
    date: "26 November 1949",
    title: "Constitution adopted",
    description:
      "The Constituent Assembly adopted the Constitution of India. The session record for this day is preserved in this archive's Constituent Assembly Debates collection.",
    category: "constitution",
    image_url: "/images/tl-1949.svg",
  },
  {
    year: 1951,
    date: "1951",
    title: "Hindu Code Bill in Parliament",
    description:
      "Championed the Hindu Code Bill, landmark social legislation, as Law Minister in India's first Parliament.",
    category: "legacy",
    image_url: null,
  },
  {
    year: 1956,
    date: "14 October 1956",
    title: "Embraces Buddhism",
    description:
      "Embraced Buddhism at Nagpur together with a large gathering of followers.",
    category: "conversion",
    image_url: "/images/tl-1956.svg",
  },
  {
    year: 1956,
    date: "6 December 1956",
    title: "Mahaparinirvan",
    description:
      "Died in Delhi. Followers observe the day as his Mahaparinirvan.",
    category: "legacy",
    image_url: "/images/tl-1956b.svg",
  },
];

async function main() {
  const { count, error } = await admin
    .from("timeline_events")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("Failed to check timeline_events:", error.message);
    process.exit(1);
  }

  if (count > 0) {
    if (!process.argv.includes("--force")) {
      console.error(
        `timeline_events already has ${count} rows. Refusing to insert duplicates.\n` +
          "Re-run with --force to delete the existing rows and reseed."
      );
      process.exit(1);
    }
    const del = await admin.from("timeline_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (del.error) {
      console.error("Failed to clear existing rows:", del.error.message);
      process.exit(1);
    }
    console.log(`Cleared ${count} existing rows (--force).`);
  }

  const { error: insErr, data } = await admin
    .from("timeline_events")
    .insert(EVENTS)
    .select("id, year, title");

  if (insErr) {
    console.error("Insert failed:", insErr.message);
    process.exit(1);
  }
  console.log(`Inserted ${data.length} timeline events:`);
  for (const row of data) console.log(`  - ${row.year} | ${row.title}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
