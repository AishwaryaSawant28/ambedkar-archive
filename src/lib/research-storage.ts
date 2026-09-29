"use client";

/**
 * My Research — demo-level browser-local storage.
 *
 * Anonymous visitors have no database identity, so saved items and notes are
 * stored in localStorage under namespaced keys. This is clearly presented as
 * a local research workspace, not a permanent account.
 */

export interface SavedResearchItem {
  documentId: string;
  title: string;
  author: string | null;
  year: number | null;
  savedAt: string;
  folder: string;
}

export interface ResearchNoteItem {
  id: string;
  documentId: string;
  documentTitle: string;
  note: string;
  createdAt: string;
}

const SAVED_KEY = "dha:research:saved";
const NOTES_KEY = "dha:research:notes";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("dha:research-changed"));
  } catch {
    // storage unavailable (private mode etc.) — fail silently
  }
}

export function getSavedItems(): SavedResearchItem[] {
  return read<SavedResearchItem>(SAVED_KEY);
}

export function isSaved(documentId: string): boolean {
  return getSavedItems().some((item) => item.documentId === documentId);
}

export function saveItem(item: Omit<SavedResearchItem, "savedAt">): SavedResearchItem[] {
  const items = getSavedItems().filter((i) => i.documentId !== item.documentId);
  const next = [{ ...item, savedAt: new Date().toISOString() }, ...items];
  write(SAVED_KEY, next);
  return next;
}

export function removeItem(documentId: string): SavedResearchItem[] {
  const next = getSavedItems().filter((i) => i.documentId !== documentId);
  write(SAVED_KEY, next);
  return next;
}

export function getNotes(): ResearchNoteItem[] {
  return read<ResearchNoteItem>(NOTES_KEY);
}

export function addNote(
  note: Omit<ResearchNoteItem, "id" | "createdAt">
): ResearchNoteItem[] {
  const next = [
    { ...note, id: `note-${Date.now()}`, createdAt: new Date().toISOString() },
    ...getNotes(),
  ];
  write(NOTES_KEY, next);
  return next;
}

export function removeNote(id: string): ResearchNoteItem[] {
  const next = getNotes().filter((n) => n.id !== id);
  write(NOTES_KEY, next);
  return next;
}
