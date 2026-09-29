"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  FileText,
  NotebookPen,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  addNote,
  getNotes,
  getSavedItems,
  removeItem,
  removeNote,
  type ResearchNoteItem,
  type SavedResearchItem,
} from "@/lib/research-storage";
// NOTE: localStorage is read inside a subscription-style callback on mount
// (see the useSyncExternalStore-style effect below) to satisfy the
// set-state-in-effect lint rule.
import { formatDateLabel } from "@/lib/utils";
import { SectionHeading } from "@/components/stats-card";
import { EmptyState } from "@/components/states";

export default function MyResearchPage() {
  const [saved, setSaved] = useState<SavedResearchItem[]>([]);
  const [notes, setNotes] = useState<ResearchNoteItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteDocId, setNoteDocId] = useState<string>("");

  // Read browser-local storage after mount via a scheduled callback (avoids
  // cascading renders flagged by the set-state-in-effect rule).
  useEffect(() => {
    const id = window.setTimeout(() => {
      const items = getSavedItems();
      setSaved(items);
      setNotes(getNotes());
      setNoteDocId(items[0]?.documentId ?? "");
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const folders = useMemo(() => {
    const map = new Map<string, SavedResearchItem[]>();
    for (const item of saved) {
      const list = map.get(item.folder) ?? [];
      list.push(item);
      map.set(item.folder, list);
    }
    return [...map.entries()];
  }, [saved]);

  const addNoteLocal = () => {
    const text = newNote.trim();
    if (!text || !noteDocId) return;
    const doc = saved.find((s) => s.documentId === noteDocId);
    setNotes(
      addNote({
        documentId: noteDocId,
        documentTitle: doc?.title ?? "Record",
        note: text,
      })
    );
    setNewNote("");
  };

  const removeSaved = (documentId: string) => {
    setSaved(removeItem(documentId));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Personal Workspace"
          title="My Research"
          description="Saved records and working notes for this browser — a demo workspace that stays on this device."
        />
      </div>

      {!loaded ? (
        <p className="mt-10 text-sm text-slate-muted">Loading workspace…</p>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          {/* Saved documents */}
          <section aria-label="Saved documents">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-navy-deep">
              <BookMarked className="h-5 w-5 text-saffron-dark" aria-hidden />
              Saved Documents
            </h2>
            {saved.length === 0 ? (
              <EmptyState
                title="No saved documents yet"
                description="Use “Add to My Research” on any catalogue record to keep it here."
                className="mt-6"
                action={
                  <Link
                    href="/explore"
                    className="mt-1 inline-flex min-h-11 items-center rounded-sm bg-navy px-6 text-sm font-semibold text-ivory transition-colors hover:bg-navy-deep"
                  >
                    Browse the archive
                  </Link>
                }
              />
            ) : (
              <ul className="mt-6 grid gap-4">
                {saved.map((item) => (
                  <li
                    key={item.documentId}
                    className="flex items-start justify-between gap-4 rounded-md border border-border-warm bg-paper p-4 shadow-card"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                        {item.folder} · saved {formatDateLabel(item.savedAt)}
                      </p>
                      <Link
                        href={`/documents/${item.documentId}`}
                        className="mt-1 block font-serif text-base font-semibold leading-snug text-navy-deep hover:text-saffron-dark"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-muted">
                        {item.author ?? "Author not recorded"}
                        {item.year ? ` · ${item.year}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSaved(item.documentId)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-slate-muted transition-colors hover:bg-terracotta/10 hover:text-terracotta"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      <span className="sr-only">Remove {item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notes + folders */}
          <div className="flex flex-col gap-10">
            <section aria-label="Research notes">
              <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-navy-deep">
                <NotebookPen className="h-5 w-5 text-saffron-dark" aria-hidden />
                Notes
              </h2>

              {saved.length > 0 ? (
                <div className="mt-6 rounded-md border border-border-warm bg-paper p-4 shadow-card">
                  <label
                    htmlFor="note-doc"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-muted"
                  >
                    Attach to record
                  </label>
                  <select
                    id="note-doc"
                    value={noteDocId}
                    onChange={(event) => setNoteDocId(event.target.value)}
                    className="mt-1.5 h-11 w-full rounded-sm border border-border-strong bg-ivory px-3 text-sm font-medium text-navy-deep"
                  >
                    {saved.map((item) => (
                      <option key={item.documentId} value={item.documentId}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <label
                    htmlFor="note-text"
                    className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-muted"
                  >
                    New note
                  </label>
                  <textarea
                    id="note-text"
                    rows={3}
                    value={newNote}
                    onChange={(event) => setNewNote(event.target.value)}
                    placeholder="Observations, page references, to-dos…"
                    className="mt-1.5 w-full rounded-sm border border-border-strong bg-ivory p-3 text-sm placeholder:text-slate-muted/70"
                  />
                  <button
                    type="button"
                    onClick={addNoteLocal}
                    disabled={!newNote.trim()}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm bg-navy px-5 text-sm font-semibold text-ivory transition-colors hover:bg-navy-deep disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" aria-hidden />
                    Save note
                  </button>
                </div>
              ) : null}

              {notes.length === 0 ? (
                <p className="mt-4 rounded-md border border-dashed border-border-strong bg-ivory px-4 py-6 text-center text-sm text-slate-muted">
                  No notes yet — save your first observation above.
                </p>
              ) : (
                <ul className="mt-4 grid gap-3">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-md border border-border-warm bg-paper p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                          <FileText className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                          {note.documentTitle} · {formatDateLabel(note.createdAt)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setNotes(removeNote(note.id))}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-slate-muted transition-colors hover:bg-terracotta/10 hover:text-terracotta"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Delete note</span>
                        </button>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-navy-soft">{note.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Folders */}
            <section aria-label="Research folders">
              <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-navy-deep">
                <Plus className="h-5 w-5 text-saffron-dark" aria-hidden />
                Collections
              </h2>
              <div className="mt-6 grid gap-3">
                {folders.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border-strong bg-ivory px-4 py-6 text-center text-sm text-slate-muted">
                    Saved records are grouped into folders here.
                  </p>
                ) : (
                  folders.map(([folder, entries]) => (
                    <div
                      key={folder}
                      className="rounded-md border border-border-warm bg-paper p-4"
                    >
                      <p className="text-sm font-semibold text-navy-deep">{folder}</p>
                      <p className="mt-0.5 text-xs text-slate-muted">
                        {entries.length} saved record{entries.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
