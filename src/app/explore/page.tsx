"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import type {
  ArchiveDocument,
  DocumentCategory,
  DocumentType,
  Language,
  SortField,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { CATEGORY_LABELS, LANGUAGES_LABEL } from "@/lib/utils";
import { DocumentCard } from "@/components/document-card";
import { EmptyState } from "@/components/states";

type SupabaseDocument = {
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
  content: string | null;
  summary: string | null;
  ocr_status: string | null;
  access: string | null;
  created_at: string;
};

function mapDocument(doc: SupabaseDocument): ArchiveDocument {
  const categoryMap: Record<string, DocumentCategory> = {
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

  const languageMap: Record<string, Language> = {
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

  const documentType = (
    doc.document_type && [
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
    ].includes(doc.document_type)
      ? doc.document_type
      : "Essay"
  ) as DocumentType;

  const year = doc.year ?? 0;

  return {
    id: doc.id,
    title: doc.title,
    author: doc.author ?? "B. R. Ambedkar",
    dateLabel: doc.date ?? String(year),
    year,
    category: categoryMap[doc.document_type ?? ""] ?? "writings",
    documentType,
    language: languageMap[doc.language ?? "en"] ?? "English",
    excerpt: doc.summary ?? doc.description ?? "Archival record.",
    ocrStatus:
      doc.ocr_status === "processed"
        ? "processed"
        : doc.ocr_status === "pending"
          ? "pending"
          : "not_started",
    status: doc.access === "public" ? "published" : "draft",
    metadata: {
      source: doc.source ?? "Digital Heritage Archive",
      accessionNumber: doc.id,
      condition: "Good",
      digitisedOn: doc.created_at,
      rights: "See source institution for rights information.",
      provenance: doc.collection ?? "Ambedkar Archive",
    },
    tags: doc.keywords ?? [],
    createdAt: doc.created_at,
  };
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-muted">
          Loading explorer…
        </div>
      }
    >
      <ExplorePageInner />
    </Suspense>
  );
}

function ExplorePageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const category = (params.get("category") ?? "all") as
    | DocumentCategory
    | "all";
  const lang = params.get("lang") ?? "all";
  const decade = params.get("decade") ?? "all";
  const sort = (params.get("sort") ?? "year-desc") as SortField;

  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("documents")
        .select(
          "id, title, description, author, year, date, document_type, language, collection, keywords, source, content, summary, ocr_status, access, created_at"
        )
        .order("date", { ascending: false });

      if (error) {
        console.error("Failed to load documents:", error);
        setError("Unable to load archive records.");
        setDocuments([]);
        setLoading(false);
        return;
      }

      setDocuments(
        ((data ?? []) as SupabaseDocument[]).map(mapDocument)
      );
      setLoading(false);
    }

    loadDocuments();
  }, []);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());

    if (value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    const queryString = next.toString();
    router.replace(
      queryString ? `/explore?${queryString}` : "/explore",
      { scroll: false }
    );
  };

  const filtered = useMemo(() => {
    let docs = [...documents];

    if (category !== "all") {
      docs = docs.filter((d) => d.category === category);
    }

    if (lang !== "all") {
      docs = docs.filter((d) => d.language === lang);
    }

    if (decade !== "all") {
      const from = Number(decade);
      docs = docs.filter(
        (d) => d.year >= from && d.year < from + 10
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase();

      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.author.toLowerCase().includes(q) ||
          d.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case "year-asc":
        docs.sort((a, b) => a.year - b.year);
        break;

      case "title-asc":
        docs.sort((a, b) => a.title.localeCompare(b.title));
        break;

      default:
        docs.sort((a, b) => b.year - a.year);
    }

    return docs;
  }, [documents, category, lang, decade, sort, query]);

  const decades = useMemo(() => {
    const set = new Set(
      documents
        .filter((doc) => doc.year > 0)
        .map((doc) => Math.floor(doc.year / 10) * 10)
    );

    return [...set].sort((a, b) => a - b);
  }, [documents]);

  const hasFilters =
    category !== "all" ||
    lang !== "all" ||
    decade !== "all" ||
    query.trim() !== "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron-dark">
          Archive Explorer
        </p>

        <h1 className="mt-2 font-serif text-3xl font-semibold text-navy-deep sm:text-4xl">
          Browse the Collections
        </h1>

        <p className="mt-3 text-base leading-relaxed text-slate-muted">
          Search and filter every catalogued record — writings, speeches,
          debates, manuscripts, photographs and recordings.
        </p>
      </header>

      <div className="mt-8 rounded-md border border-border-warm bg-paper p-5 shadow-card">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
              Search records
            </span>

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, author or tag…"
              className="h-12 rounded-sm border border-border-strong bg-ivory px-4 text-base placeholder:text-slate-muted/70"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                Category
              </span>

              <select
                value={category}
                onChange={(event) =>
                  setParam("category", event.target.value)
                }
                className="h-12 rounded-sm border border-border-strong bg-ivory px-3 text-sm font-medium text-navy-deep"
              >
                <option value="all">All categories</option>

                {Object.entries(CATEGORY_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                Language
              </span>

              <select
                value={lang}
                onChange={(event) =>
                  setParam("lang", event.target.value)
                }
                className="h-12 rounded-sm border border-border-strong bg-ivory px-3 text-sm font-medium text-navy-deep"
              >
                <option value="all">All languages</option>

                {LANGUAGES_LABEL.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                Decade
              </span>

              <select
                value={decade}
                onChange={(event) =>
                  setParam("decade", event.target.value)
                }
                className="h-12 rounded-sm border border-border-strong bg-ivory px-3 text-sm font-medium text-navy-deep"
              >
                <option value="all">All decades</option>

                {decades.map((d) => (
                  <option key={d} value={String(d)}>
                    {`${d}s`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-warm pt-4">
          <p className="text-sm text-slate-muted">
            <span className="font-semibold text-navy-deep">
              {filtered.length}
            </span>{" "}
            record{filtered.length === 1 ? "" : "s"} found
          </p>

          <div className="flex items-center gap-3">
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  router.replace("/explore", { scroll: false });
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-border-warm px-3.5 text-sm font-semibold text-slate-muted transition-colors hover:text-terracotta"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Clear filters
              </button>
            ) : null}

            <label className="inline-flex items-center gap-2 text-sm">
              <span className="text-slate-muted">Sort</span>

              <select
                value={sort}
                onChange={(event) =>
                  setParam("sort", event.target.value)
                }
                className="h-10 rounded-sm border border-border-strong bg-ivory px-3 text-sm font-medium text-navy-deep"
              >
                <option value="year-desc">Newest first</option>
                <option value="year-asc">Oldest first</option>
                <option value="title-asc">Title A–Z</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-muted">
          Loading archive records…
        </div>
      ) : error ? (
        <div className="mt-10 rounded-md border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No records match your filters"
          description="Try a different category, language or decade — or clear the filters to see the full archive."
          className="mt-10"
        />
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              showOcrStatus
            />
          ))}
        </div>
      )}
    </div>
  );
}