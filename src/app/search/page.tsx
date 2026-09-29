"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Info, Sparkles } from "lucide-react";

import type { ArchiveDocument } from "@/lib/types";
import { fetchDocuments } from "@/lib/documents";
import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/search-bar";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";

interface SemanticResult {
  documentId: string;
  title: string;
  dateLabel: string;
  documentType: string;
  source: string;
  sourceUrl: string | null;
  locator: string;
  excerpt: string;
  similarity: number;
}

const SEARCH_FIELDS = [
  "title",
  "author",
  "description",
  "summary",
  "keywords",
  "document_type",
  "collection",
] as const;

/** UI hints only — not archival facts. */
const EXAMPLE_QUERIES = [
  "draft constitution consideration",
  "article 254",
  "fundamental rights debate",
  "president in the chair",
  "assembly adjourned",
];

type Mode = "keyword" | "semantic";

function SearchPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [submittedQuery, setSubmittedQuery] = useState(params.get("q") ?? "");
  const [mode, setMode] = useState<Mode>("keyword");
  const [docs, setDocs] = useState<ArchiveDocument[]>([]);
  const [semanticResults, setSemanticResults] = useState<SemanticResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the archive index once for keyword search.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { docs: results, error: loadError } = await fetchDocuments();
      if (cancelled) return;
      setDocs(results);
      setError(loadError);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runQuery = (query: string) => {
    if (!query.trim()) return;
    setSubmittedQuery(query);
    router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
  };

  // Semantic mode: query the retrieval API when the query changes.
  useEffect(() => {
    if (mode !== "semantic") return;
    const query = submittedQuery.trim();
    if (!query) {
      const id = window.setTimeout(() => setSemanticResults(null), 0);
      return () => window.clearTimeout(id);
    }
    let cancelled = false;
    const id = window.setTimeout(() => setSearching(true), 0);
    (async () => {
      try {
        const res = await fetch("/api/semantic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const json = (await res.json()) as { results?: SemanticResult[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Semantic search is unavailable.");
          setSemanticResults(null);
        } else {
          setError(null);
          setSemanticResults(json.results ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("Semantic search could not be reached.");
          setSemanticResults(null);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [mode, submittedQuery]);

  // Keyword ranking across title, author, description, summary, keywords,
  // document_type and collection.
  const keywordResults = useMemo(() => {
    const query = submittedQuery.trim().toLowerCase();
    if (!query) return [];
    const terms = query.split(/\s+/).filter(Boolean);

    const scored: { doc: ArchiveDocument; score: number; field: string }[] = [];
    for (const doc of docs) {
      const haystacks: { field: string; text: string; weight: number }[] = [
        { field: "title", text: doc.title, weight: 6 },
        { field: "author", text: doc.author, weight: 4 },
        { field: "description", text: doc.description ?? "", weight: 2 },
        { field: "summary", text: doc.summary ?? "", weight: 3 },
        { field: "keywords", text: doc.tags.join(" "), weight: 4 },
        { field: "document_type", text: doc.documentType, weight: 2 },
        { field: "collection", text: doc.collection ?? "", weight: 2 },
      ];

      let score = 0;
      let matchedField = "title";
      for (const term of terms) {
        for (const hay of haystacks) {
          const text = hay.text.toLowerCase();
          if (!text) continue;
          if (text === term) score += hay.weight * 3;
          else if (text.startsWith(term)) score += hay.weight * 2;
          else if (text.includes(term)) score += hay.weight;
          if (score > 0 && matchedField === "title" && text.includes(term)) {
            matchedField = hay.field;
          }
        }
      }
      if (score > 0) scored.push({ doc, score, field: matchedField });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }, [docs, submittedQuery]);

  const hasQuery = submittedQuery.trim().length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron-dark">
          Archive Search
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-navy-deep sm:text-4xl">
          Search the Records
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-muted">
          Search across titles, authors, descriptions, summaries, keywords,
          document types and collections — or switch to semantic mode to match
          passages of the archival text by meaning.
        </p>
      </header>

      <div className="mt-8">
        {/* Mode switch */}
        <div
          role="group"
          aria-label="Search mode"
          className="mb-4 inline-flex rounded-sm border border-border-strong bg-paper p-1"
        >
          {(
            [
              { key: "keyword", label: "Keyword search" },
              { key: "semantic", label: "Semantic search" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMode(option.key)}
              aria-pressed={mode === option.key}
              className={cn(
                "min-h-10 rounded-sm px-4 text-sm font-semibold transition-colors",
                mode === option.key
                  ? "bg-navy text-ivory"
                  : "text-navy-soft hover:text-navy-deep"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <SearchBar
          size="lg"
          placeholder={
            mode === "semantic"
              ? "e.g. debates about article 254…"
              : "e.g. constitution, Ambedkar, 1949…"
          }
          onSubmit={runQuery}
        />
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-muted">
          <Info className="h-3.5 w-3.5" aria-hidden />
          {mode === "semantic"
            ? "Semantic mode ranks passages of archival text by meaning; scores are actual similarity values."
            : `Keyword mode covers ${SEARCH_FIELDS.join(", ")} of ${loading ? "…" : docs.length} records.`}
        </p>
      </div>

      {!hasQuery ? (
        <section className="mt-12" aria-label="Example queries">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-muted">
            Try an example query
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {EXAMPLE_QUERIES.map((query) => (
              <li key={query}>
                <button
                  type="button"
                  onClick={() => runQuery(query)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-md border border-border-warm bg-paper px-4 py-3 text-left text-sm font-medium text-navy-soft shadow-card transition-colors hover:border-saffron/60 hover:text-navy-deep"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-saffron-dark" aria-hidden />
                  {query}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="mt-10" aria-label="Search results">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold text-navy-deep">
              Results for <span className="text-saffron-dark">“{submittedQuery}”</span>
            </h2>
            <p className="text-sm text-slate-muted">
              {mode === "semantic" ? searching
                ? "Searching…"
                : `${semanticResults?.length ?? 0} passage${semanticResults?.length === 1 ? "" : "s"}`
              : `${keywordResults.length} record${keywordResults.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {error ? (
            <ErrorState title="Search is unavailable" description={error} />
          ) : mode === "semantic" ? (
            searching ? (
              <LoadingState label="Embedding the query and matching passages…" />
            ) : semanticResults && semanticResults.length > 0 ? (
              <ul className="mt-6 grid gap-4">
                {semanticResults.map((result) => (
                  <li key={`${result.documentId}-${result.locator}`}>
                    <article className="rounded-md border border-border-warm bg-paper p-6 shadow-card transition-colors hover:border-saffron/50">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-soft">
                          <span>{result.documentType}</span>
                          <span aria-hidden>·</span>
                          <span>{result.dateLabel}</span>
                          <span aria-hidden>·</span>
                          <span>{result.locator}</span>
                        </div>
                        {/* Real similarity score from the retrieval system */}
                        <div
                          className="flex items-center gap-2"
                          title="Cosine similarity returned by the archive retrieval index"
                        >
                          <span className="text-xs font-semibold text-slate-muted">Similarity</span>
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-parchment-dark">
                            <span
                              className={cn(
                                "block h-full rounded-full",
                                result.similarity >= 0.5
                                  ? "bg-moss"
                                  : result.similarity >= 0.3
                                    ? "bg-saffron"
                                    : "bg-terracotta/70"
                              )}
                              style={{ width: `${Math.round(result.similarity * 100)}%` }}
                            />
                          </span>
                          <span className="text-xs font-semibold text-navy-deep">
                            {result.similarity.toFixed(3)}
                          </span>
                        </div>
                      </div>

                      <h3 className="mt-3 font-serif text-xl font-semibold text-navy-deep">
                        <a href={`/documents/${result.documentId}`} className="hover:text-saffron-dark">
                          {result.title}
                        </a>
                      </h3>

                      <blockquote className="mt-3 border-l-4 border-saffron/60 bg-ivory px-4 py-3 text-sm leading-relaxed text-navy-soft">
                        {result.excerpt}
                      </blockquote>

                      <p className="mt-3 text-xs text-slate-muted">
                        Source: {result.source}
                        {result.sourceUrl ? (
                          <>
                            {" · "}
                            <a
                              href={result.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-saffron-dark hover:underline"
                            >
                              official source
                            </a>
                          </>
                        ) : null}
                      </p>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No matching passages"
                description="No indexed passage matched this question. The full text may not be ingested yet — try keyword mode or browse the explorer."
                className="mt-8"
              />
            )
          ) : loading ? (
            <LoadingState label="Loading the archive index…" />
          ) : keywordResults.length === 0 ? (
            <EmptyState
              title="No matching records"
              description="Try a broader term, or explore records directly in the Archive Explorer."
              className="mt-8"
              action={
                <button
                  type="button"
                  onClick={() => router.push("/explore")}
                  className="mt-1 inline-flex min-h-11 items-center rounded-sm bg-navy px-6 text-sm font-semibold text-ivory transition-colors hover:bg-navy-deep"
                >
                  Open Archive Explorer
                </button>
              }
            />
          ) : (
            <ul className="mt-6 grid gap-4">
              {keywordResults.map(({ doc }) => (
                <li key={doc.id}>
                  <article className="rounded-md border border-border-warm bg-paper p-6 shadow-card transition-colors hover:border-saffron/50">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-soft">
                      <span>{doc.documentType}</span>
                      <span aria-hidden>·</span>
                      <span>{doc.year > 0 ? doc.year : doc.dateLabel}</span>
                      <span aria-hidden>·</span>
                      <span>{doc.language}</span>
                    </div>

                    <h3 className="mt-3 font-serif text-xl font-semibold text-navy-deep">
                      <a href={`/documents/${doc.id}`} className="hover:text-saffron-dark">
                        {doc.title}
                      </a>
                    </h3>

                    <blockquote className="mt-3 border-l-4 border-saffron/60 bg-ivory px-4 py-3 text-sm leading-relaxed text-navy-soft">
                      {doc.excerpt}
                    </blockquote>

                    <p className="mt-3 text-xs text-slate-muted">
                      Source: {doc.metadata.source} · {doc.author}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-slate-muted">Loading search…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
