import type {
  ArchiveDocument,
  DocumentCategory,
  DocumentType,
  Language,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";

/**
 * Shared data-access layer for the `documents` table.
 *
 * The database schema is intentionally not changed here: fields that exist
 * only in the richer UI type are filled with clearly generic fallbacks
 * (labelled "not recorded") rather than invented archival facts.
 */

/** Column list shared by every read so results map consistently. */
export const DOCUMENT_COLUMNS =
  "id, title, description, author, year, date, document_type, language, collection, keywords, source, source_url, content, summary, ocr_status, access, created_at";

export type SupabaseDocument = {
  id: string;
  title: string;
  description: string | null;
  author: string | null;
  year: number | null;
  date: string | null;
  document_type: string | null;
  language: string | null;
  collection: string | null;
  keywords: string[] | null;
  source: string | null;
  source_url: string | null;
  content: string | null;
  summary: string | null;
  ocr_status: string | null;
  access: string | null;
  created_at: string;
};

const CATEGORY_BY_TYPE: Record<string, DocumentCategory> = {
  "Constituent Assembly Debate": "constitutional-debates",
  "Parliamentary Debate": "constitutional-debates",
  Book: "writings",
  Essay: "writings",
  Speech: "speeches",
  "Newspaper Article": "writings",
  Memorandum: "writings",
  Manuscript: "manuscripts",
  Letter: "writings",
  Photograph: "photographs",
  "Audio Recording": "media",
  "Video Recording": "media",
};

const LANGUAGE_BY_CODE: Record<string, Language> = {
  en: "English",
  English: "English",
  mr: "Marathi",
  Marathi: "Marathi",
  hi: "Hindi",
  Hindi: "Hindi",
  pi: "Pali",
  Pali: "Pali",
  gu: "Gujarati",
  Gujarati: "Gujarati",
};

const DOCUMENT_TYPE_NAMES: DocumentType[] = [
  "Book",
  "Essay",
  "Speech",
  "Newspaper Article",
  "Parliamentary Debate",
  "Constituent Assembly Debate",
  "Memorandum",
  "Manuscript",
  "Letter",
  "Photograph",
  "Audio Recording",
  "Video Recording",
];

/** Map a `documents` row to the UI's ArchiveDocument shape. */
export function mapDocument(doc: SupabaseDocument): ArchiveDocument {
  const documentType: DocumentType =
    doc.document_type && DOCUMENT_TYPE_NAMES.includes(doc.document_type as DocumentType)
      ? (doc.document_type as DocumentType)
      : "Essay";

  const year = doc.year ?? 0;

  return {
    id: doc.id,
    title: doc.title,
    // Generic fallback — authorship is only shown when recorded in the database.
    author: doc.author ?? "Author not recorded",
    dateLabel: doc.date ?? (year > 0 ? String(year) : "Date not recorded"),
    year,
    category: CATEGORY_BY_TYPE[doc.document_type ?? ""] ?? "writings",
    documentType,
    language: LANGUAGE_BY_CODE[doc.language ?? "en"] ?? "English",
    excerpt: doc.summary ?? doc.description ?? "No description recorded.",
    // Richer database fields exposed to the UI where present.
    description: doc.description,
    summary: doc.summary,
    content: doc.content,
    sourceUrl: doc.source_url,
    collection: doc.collection,
    ocrStatus:
      doc.ocr_status === "processed"
        ? "processed"
        : doc.ocr_status === "pending"
          ? "pending"
          : doc.ocr_status === "none"
            ? "none"
            : "not_started",
    status: doc.access === "public" ? "published" : "draft",
    metadata: {
      source: doc.source ?? "Source not recorded",
      // The schema has no accession field — show an explicit placeholder
      // rather than presenting the row id as a call number.
      accessionNumber: "Not assigned",
      // No condition field in the schema — surfaced as "Not recorded".
      condition: "Not recorded",
      // No digitisation date exists in the schema; created_at is an internal
      // record timestamp, NOT historical metadata.
      digitisedOn: "Not recorded",
      rights: "Rights information not recorded; consult the holding institution.",
      provenance: doc.collection ?? "Collection not recorded",
    },
    tags: doc.keywords ?? [],
    createdAt: doc.created_at,
  };
}

/** Fetch all catalogued documents, newest first. */
export async function fetchDocuments(): Promise<{
  docs: ArchiveDocument[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .order("date", { ascending: false });

  if (error) {
    console.error("Failed to load documents:", error);
    return { docs: [], error: "Unable to load archive records." };
  }

  return { docs: ((data ?? []) as SupabaseDocument[]).map(mapDocument), error: null };
}

/** Fetch a single document by id. Returns null when the record does not exist. */
export async function fetchDocumentById(id: string): Promise<{
  doc: ArchiveDocument | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load document:", error);
    return { doc: null, error: "Unable to load this archive record." };
  }

  return { doc: data ? mapDocument(data as SupabaseDocument) : null, error: null };
}

/** Fetch related records: same collection first, otherwise other recent records. */
export async function fetchRelatedDocuments(
  doc: ArchiveDocument,
  limit = 3
): Promise<ArchiveDocument[]> {
  const base = supabase.from("documents").select(DOCUMENT_COLUMNS);

  const query = doc.collection
    ? base.eq("collection", doc.collection).neq("id", doc.id)
    : base.neq("id", doc.id);

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error("Failed to load related documents:", error);
    return [];
  }

  return ((data ?? []) as SupabaseDocument[]).map(mapDocument);
}
