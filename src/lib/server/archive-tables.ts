/**
 * Server-side fetchers for timeline_events, media and collections tables.
 * All reads go through the admin client so they work regardless of public
 * RLS read policies on these tables.
 */
import "server-only";

import { getAdminClient } from "./admin";
import type { MediaItem, TimelineEvent } from "@/lib/types";

export interface TimelineRow {
  id: string;
  year: number | null;
  date: string | null;
  title: string | null;
  description: string | null;
  image_url: string | null;
  category: string | null;
}

export interface MediaRow {
  id: string;
  title: string | null;
  description: string | null;
  type: string | null;
  url: string | null;
  thumbnail: string | null;
  year: number | null;
  source: string | null;
}

export interface CollectionRow {
  id: string;
  name: string | null;
  description: string | null;
  document_ids: string[] | null;
}

export async function fetchTimelineEvents(): Promise<{
  events: TimelineEvent[];
  error: string | null;
}> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("timeline_events")
    .select("id, year, date, title, description, image_url, category")
    .order("year", { ascending: true });

  if (error) {
    console.error("[archive-tables] timeline fetch failed:", error.message);
    return { events: [], error: "Unable to load the timeline." };
  }

  // Era keys match the UI filter chips in components/timeline.tsx.
  const ERA_KEYS = [
    "early-life",
    "education",
    "movement",
    "constitution",
    "conversion",
    "legacy",
  ] as const;

  const events: TimelineEvent[] = (data ?? []).map((row: TimelineRow) => {
    const category = row.category ?? "";
    const era = (ERA_KEYS as readonly string[]).includes(category)
      ? (category as TimelineEvent["era"])
      : "legacy";
    return {
      id: row.id,
      year: row.year ?? 0,
      dateLabel: row.date ?? (row.year != null ? String(row.year) : "Date not recorded"),
      title: row.title ?? "Untitled event",
      description: row.description ?? "No description recorded.",
      // No location column in the schema — shown as not recorded.
      location: "Location not recorded",
      era,
      eraLabel: row.category ?? "Uncategorised",
      relatedDocumentIds: [],
      imageUrl: row.image_url ?? undefined,
    };
  });

  return { events, error: null };
}

export async function fetchMediaItems(): Promise<{
  items: MediaItem[];
  error: string | null;
}> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("media")
    .select("id, title, description, type, url, thumbnail, year, source")
    .order("year", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[archive-tables] media fetch failed:", error.message);
    return { items: [], error: "Unable to load media records." };
  }

  const items: MediaItem[] = (data ?? []).map((row: MediaRow) => ({
    id: row.id,
    title: row.title ?? "Untitled media item",
    kind: "video",
    kindLabel: row.type ?? "Media",
    year: row.year ?? 0,
    durationLabel: null,
    description: row.description ?? "No description recorded.",
    source: row.source ?? "Source not recorded",
    thumbnailUrl: row.thumbnail,
    mediaUrl: row.url,
  }));

  return { items, error: null };
}

export async function fetchCollections(): Promise<{
  collections: {
    id: string;
    name: string;
    description: string;
    documentCount: number | null;
  }[];
  error: string | null;
}> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("collections")
    .select("id, name, description, document_ids");

  if (error) {
    console.error("[archive-tables] collections fetch failed:", error.message);
    return { collections: [], error: "Unable to load collections." };
  }

  const collections = (data ?? []).map((row: CollectionRow) => ({
    id: row.id,
    name: row.name ?? "Untitled collection",
    description: row.description ?? "No description recorded.",
    documentCount: Array.isArray(row.document_ids) ? row.document_ids.length : null,
  }));

  return { collections, error: null };
}

/** Live archive statistics for the home dashboard. */
export async function fetchArchiveCounts(): Promise<{
  totalDocuments: number | null;
  mediaItems: number | null;
  ocrProcessed: number | null;
  manuscripts: number | null;
  chunksIndexed: number | null;
  error: string | null;
}> {
  const admin = getAdminClient();
  try {
    const [docs, media, chunks, manuscripts] = await Promise.all([
      admin.from("documents").select("id", { count: "exact", head: true }),
      admin.from("media").select("id", { count: "exact", head: true }),
      admin.from("document_chunks").select("id", { count: "exact", head: true }),
      admin
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("document_type", "Manuscript"),
    ]);

    return {
      totalDocuments: docs.count,
      mediaItems: media.count,
      chunksIndexed: chunks.count,
      manuscripts: manuscripts.count,
      ocrProcessed: null,
      error: null,
    };
  } catch (err) {
    console.error("[archive-tables] counts failed:", err);
    return {
      totalDocuments: null,
      mediaItems: null,
      chunksIndexed: null,
      manuscripts: null,
      ocrProcessed: null,
      error: "Unable to load archive statistics.",
    };
  }
}
