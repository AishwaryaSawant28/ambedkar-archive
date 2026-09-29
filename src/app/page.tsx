import Link from "next/link";
import {
  ArchiveRestore,
  ArrowRight,
  AudioLines,
  BookOpen,
  Landmark,
  ScrollText,
  Sparkles,
  Video,
} from "lucide-react";

import { SearchBar } from "@/components/search-bar";
import { DocumentCard } from "@/components/document-card";
import { SectionHeading } from "@/components/stats-card";
import { TimelinePreview } from "@/components/timeline";
import { fetchDocuments } from "@/lib/documents";
import { fetchArchiveCounts } from "@/lib/server/archive-tables";
import { CATEGORY_DESCRIPTIONS } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/types";

const EXPLORE_ICONS: Record<string, typeof BookOpen> = {
  writings: BookOpen,
  speeches: AudioLines,
  "constitutional-debates": Landmark,
  manuscripts: ScrollText,
  photographs: ArchiveRestore,
  media: Video,
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Live data (server-side). Falls back to honest empty states on failure.
  const [{ docs }, counts, timeline] = await Promise.all([
    fetchDocuments(),
    fetchArchiveCounts(),
    import("@/lib/server/archive-tables").then(({ fetchTimelineEvents }) =>
      fetchTimelineEvents()
    ),
  ]);

  const featured = docs.slice(0, 3);
  const previewEvents: TimelineEvent[] = timeline.events.slice(-4);

  const statCards = [
    { label: "Archival records", value: counts.totalDocuments },
    { label: "Manuscripts", value: counts.manuscripts },
    { label: "Media records", value: counts.mediaItems },
    { label: "Indexed text passages", value: counts.chunksIndexed },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="paper-grain relative overflow-hidden border-b border-border-warm bg-parchment">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-saffron/40 bg-paper px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-saffron-dark">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Institutional Archive · SIH26096
            </p>
            <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight text-navy-deep sm:text-5xl lg:text-6xl">
              Digital Heritage Archive
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-navy-soft">
              Preserving and making explorable the writings, speeches,
              manuscripts, constitutional debates and audio-visual heritage of
              Dr. B. R. Ambedkar — for students, researchers and visitors,
              on the web and on gallery touchscreens.
            </p>

            <div className="mt-8 max-w-2xl">
              <SearchBar size="lg" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/assistant"
                className="inline-flex min-h-12 items-center gap-2 rounded-sm bg-terracotta px-6 font-semibold text-ivory shadow-card transition-colors hover:bg-terracotta/90"
              >
                <Sparkles className="h-5 w-5" aria-hidden />
                Ask the Archive
              </Link>
              <Link
                href="/explore"
                className="inline-flex min-h-12 items-center gap-2 rounded-sm border-2 border-navy px-6 font-semibold text-navy transition-colors hover:bg-navy hover:text-ivory"
              >
                Explore the Archive
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative overflow-hidden rounded-md border-8 border-paper shadow-panel">
              <div className="relative aspect-[4/3]">
                <div
                  role="img"
                  aria-label="Archival motif honouring Dr. B. R. Ambedkar: a constitutional document beneath the twenty-four-spoked wheel"
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url(/images/ambedkar-motif.svg)" }}
                />
              </div>
            </div>
            <div className="absolute -bottom-5 left-8 rounded-md border border-border-warm bg-paper px-5 py-3.5 shadow-lift">
              <p className="font-serif text-2xl font-semibold text-navy-deep">
                {counts.totalDocuments ?? "—"}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                Archival records
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live archive statistics */}
      <section
        aria-label="Archive statistics"
        className="border-b border-border-warm bg-paper"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          {statCards.map((stat) => (
            <div key={stat.label}>
              <p className="font-serif text-3xl font-semibold text-navy-deep">
                {stat.value ?? "—"}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Explore cards */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Begin Exploring"
            title="Explore by Collection"
            description="Curated pathways into the archive, from printed essays to recorded proceedings."
          />
          <Link
            href="/collections"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-navy transition-colors hover:text-saffron-dark"
          >
            All collections →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(CATEGORY_DESCRIPTIONS).map(([slug, description]) => {
            const Icon = EXPLORE_ICONS[slug] ?? BookOpen;
            const label =
              slug === "constitutional-debates"
                ? "Constitutional Debates"
                : slug === "media"
                  ? "Audio & Video"
                  : slug.charAt(0).toUpperCase() + slug.slice(1);
            return (
              <Link
                key={slug}
                href={`/explore?category=${slug}`}
                className="group rounded-md border border-border-warm bg-paper p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-sm bg-saffron-soft text-saffron-dark">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 font-serif text-xl font-semibold text-navy-deep group-hover:text-saffron-dark">
                  {label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-muted">{description}</p>
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-soft group-hover:text-saffron-dark">
                  Browse
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured archival items */}
      <section className="border-y border-border-warm bg-parchment/50">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="From the Stacks"
              title="Featured Archival Items"
              description="Records from the archive catalogue."
            />
            <Link
              href="/explore"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-navy transition-colors hover:text-saffron-dark"
            >
              View all records →
            </Link>
          </div>
          {featured.length > 0 ? (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {featured.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          ) : (
            <p className="mt-10 rounded-md border border-dashed border-border-strong bg-paper px-6 py-12 text-center text-sm text-slate-muted">
              No catalogue records are available right now.
            </p>
          )}
        </div>
      </section>

      {/* Timeline + knowledge preview */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Chronology"
              title="A Life in Milestones"
              description="Milestones recorded in the archive's chronological index."
            />
            <div className="mt-8">
              {previewEvents.length > 0 ? (
                <TimelinePreview events={previewEvents} />
              ) : (
                <p className="rounded-md border border-dashed border-border-strong bg-paper px-5 py-8 text-center text-sm text-slate-muted">
                  Timeline records have not been added yet.
                </p>
              )}
            </div>
            <Link
              href="/timeline"
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-sm bg-navy px-6 font-semibold text-ivory transition-colors hover:bg-navy-deep"
            >
              Open the Interactive Timeline
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>

          <div className="rounded-md border border-border-warm bg-paper p-8 shadow-card">
            <SectionHeading
              eyebrow="Concepts"
              title="Knowledge Preview"
              description="Entries from the evolving concept index that links people, laws, places and movements across the archive."
            />
            <dl className="mt-8 grid gap-4">
              {[
                ["Constituent Assembly Debates", "Collection · 1949", "Verbatim proceedings of the framing of the Constitution, digitised from the official record."],
                ["Draft Constitution", "Subject · 1948–1949", "Article-by-article consideration recorded across the debate volumes."],
                ["Fundamental Rights", "Concept", "Clauses debated in the Assembly covering equality and liberty."],
                ["Assembly Proceedings", "Record type", "Daily sessions with speaker attributions and volume references."],
              ].map(([term, kind, blurb]) => (
                <Link
                  key={term}
                  href="/search"
                  className="group grid gap-1 rounded-md border border-border-warm bg-ivory p-4 transition-colors hover:border-saffron/60"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="font-serif text-lg font-semibold text-navy-deep group-hover:text-saffron-dark">
                      {term}
                    </dt>
                    <dd className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                      {kind}
                    </dd>
                  </div>
                  <p className="text-sm text-slate-muted">{blurb}</p>
                </Link>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}
