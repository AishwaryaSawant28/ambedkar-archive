/**
 * Live per-category document counts for the collections pathways.
 * Maps the UI's canonical categories to the document_type values recorded
 * in the database (same mapping as the documents layer).
 */
import "server-only";

import { getAdminClient } from "./admin";
import type { DocumentCategory } from "@/lib/types";

const TYPES_BY_CATEGORY: Record<DocumentCategory, string[]> = {
  writings: ["Book", "Essay", "Newspaper Article", "Memorandum", "Letter"],
  speeches: ["Speech"],
  "constitutional-debates": ["Constituent Assembly Debate", "Parliamentary Debate"],
  manuscripts: ["Manuscript"],
  photographs: ["Photograph"],
  media: ["Audio Recording", "Video Recording"],
};

export async function fetchCategoryCounts(): Promise<Record<string, number | null>> {
  const admin = getAdminClient();
  const counts: Record<string, number | null> = {};

  await Promise.all(
    (Object.keys(TYPES_BY_CATEGORY) as DocumentCategory[]).map(async (category) => {
      const types = TYPES_BY_CATEGORY[category];
      let query = admin
        .from("documents")
        .select("id", { count: "exact", head: true });
      if (types.length === 1) {
        query = query.eq("document_type", types[0]);
      } else {
        query = query.in("document_type", types);
      }
      const { count, error } = await query;
      counts[category] = error ? null : (count ?? 0);
    })
  );

  return counts;
}
