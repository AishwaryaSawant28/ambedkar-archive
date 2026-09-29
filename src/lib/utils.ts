import type { DocumentCategory, DocumentType } from "./types";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  writings: "Writings",
  speeches: "Speeches",
  "constitutional-debates": "Constitutional Debates",
  manuscripts: "Rare Manuscripts",
  photographs: "Photographs",
  media: "Audio & Video",
};

export const CATEGORY_DESCRIPTIONS: Record<DocumentCategory, string> = {
  writings:
    "Books, essays and pamphlets spanning economics, caste, religion and law.",
  speeches:
    "Addresses delivered across three decades of public life, preserved in transcripts.",
  "constitutional-debates":
    "Constituent Assembly and parliamentary proceedings on the framing of the Republic.",
  manuscripts:
    "Handwritten drafts, notes and letters held in institutional collections.",
  photographs:
    "Documentary photographs from public gatherings, classrooms and conferences.",
  media:
    "Audio and video recordings, documentaries and radio addresses.",
};

/** Neutral document-type accent used across cards and tables. */
export const TYPE_ACCENTS: Record<DocumentType, { dot: string; text: string }> = {
  Book: { dot: "bg-saffron", text: "text-saffron-dark" },
  Essay: { dot: "bg-saffron", text: "text-saffron-dark" },
  Speech: { dot: "bg-terracotta", text: "text-terracotta" },
  "Newspaper Article": { dot: "bg-olive", text: "text-olive" },
  "Parliamentary Debate": { dot: "bg-navy", text: "text-navy" },
  "Constituent Assembly Debate": { dot: "bg-navy", text: "text-navy" },
  Memorandum: { dot: "bg-olive", text: "text-olive" },
  Manuscript: { dot: "bg-terracotta", text: "text-terracotta" },
  Letter: { dot: "bg-terracotta", text: "text-terracotta" },
  Photograph: { dot: "bg-slate-muted", text: "text-slate-muted" },
  "Audio Recording": { dot: "bg-moss", text: "text-moss" },
  "Video Recording": { dot: "bg-moss", text: "text-moss" },
};

export const LANGUAGES_LABEL: { value: string; label: string }[] = [
  { value: "English", label: "English" },
  { value: "Marathi", label: "Marathi" },
  { value: "Hindi", label: "Hindi" },
  { value: "Pali", label: "Pali" },
  { value: "Gujarati", label: "Gujarati" },
];

export function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
