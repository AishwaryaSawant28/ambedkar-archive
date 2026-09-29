/**
 * Domain types for the Digital Heritage Archive.
 *
 * These mirror the shape of future Supabase tables (id + createdAt on records,
 * reference ids for relations) so the mock layer in `src/lib/mock-data.ts`
 * can later be replaced by typed database queries with minimal churn.
 */

export const DOCUMENT_CATEGORIES = [
  "writings",
  "speeches",
  "constitutional-debates",
  "manuscripts",
  "photographs",
  "media",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_TYPES = [
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
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const LANGUAGES = ["English", "Marathi", "Hindi", "Pali", "Gujarati"] as const;

export type Language = (typeof LANGUAGES)[number];

export type OcrStatus = "processed" | "pending" | "not_started" | "none";

export type ArchivalStatus = "published" | "draft" | "archived";

export interface ArchivalMetadata {
  /** Holding institution, e.g. a library or memorial trust. */
  source: string;
  /** Reference / call number used by the holding institution. */
  accessionNumber: string;
  /** Physical or digital condition report; "Not recorded" when the schema has no value. */
  condition: "Excellent" | "Good" | "Fair" | "Fragile" | "Not recorded";
  /** Date the item was acquired or digitised. */
  digitisedOn: string;
  /** Rights statement for reproduction. */
  rights: string;
  /** Provenance / collection the item belongs to. */
  provenance: string;
}

export interface ArchiveDocument {
  id: string;
  title: string;
  author: string;
  /** ISO date string, may be partial (e.g. "1936"). */
  dateLabel: string;
  /** Sortable year for filters. */
  year: number;
  category: DocumentCategory;
  documentType: DocumentType;
  language: Language;
  /** Descriptive excerpt from the record (summary/description). */
  excerpt: string;
  /** Longer description field from the database, when present. */
  description?: string | null;
  /** Curatorial summary field from the database, when present. */
  summary?: string | null;
  /** Full text / OCR content from the database, when present. */
  content?: string | null;
  /** Link to the original archival source, when available. */
  sourceUrl?: string | null;
  /** Collection name from the database, when present. */
  collection?: string | null;
  pageCount?: number;
  durationMinutes?: number;
  ocrStatus: OcrStatus;
  status: ArchivalStatus;
  metadata: ArchivalMetadata;
  tags: string[];
  /** Placeholder image path under /public. */
  imageUrl?: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  year: number;
  dateLabel: string;
  title: string;
  /** Neutral historical description; kept factual and concise. */
  description: string;
  /** "Location not recorded" when the schema has no value. */
  location: string;
  era: "early-life" | "education" | "movement" | "constitution" | "conversion" | "legacy";
  /** Free-form category label from the database (displayed as-is). */
  eraLabel?: string;
  relatedDocumentIds: string[];
  imageUrl?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  kind: "video" | "audio" | "documentary";
  /** Free-form type label from the database (displayed as-is). */
  kindLabel?: string;
  year: number;
  /** null when no duration is recorded. */
  durationLabel: string | null;
  description: string;
  source: string;
  /** URL when attached in the database; absent means no media source yet. */
  thumbnailUrl?: string | null;
  mediaUrl?: string | null;
  documentId?: string;
}

export interface Collection {
  id: string;
  slug: DocumentCategory;
  title: string;
  description: string;
  itemCount: number;
  /** Placeholder image path under /public. */
  coverImage: string;
  accent: "saffron" | "terracotta" | "navy" | "olive" | "moss";
}

export interface CitationSource {
  documentId: string;
  title: string;
  author: string;
  year: number;
  source: string;
  documentType: DocumentType;
  /** Reference to a page or passage within the source. */
  locator: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: CitationSource[];
  /** Present on assistant error messages. */
  error?: boolean;
  pending?: boolean;
}

export interface ResearchNote {
  id: string;
  documentId: string;
  documentTitle: string;
  createdAt: string;
  note: string;
}

export interface SavedDocument {
  documentId: string;
  savedAt: string;
  folder: string;
}

export interface DashboardStats {
  totalDocuments: number;
  manuscripts: number;
  mediaItems: number;
  ocrProcessed: number;
  metadataCompletion: number;
  storageUsedGb: number;
  storageCapacityGb: number;
  preservationAlerts: number;
  recentActivity: {
    id: string;
    action: string;
    target: string;
    actor: string;
    timeLabel: string;
  }[];
}

export type SortField = "relevance" | "year-asc" | "year-desc" | "title-asc";
