import Link from "next/link";
import { BookOpen, Landmark, ScrollText, Volume2 } from "lucide-react";

import { fetchCollections } from "@/lib/server/archive-tables";
import { SectionHeading } from "@/components/stats-card";
import { EmptyState } from "@/components/states";
import type { DocumentCategory } from "@/lib/types";

export const metadata = { title: "Collections" };
export const dynamic = "force-dynamic";

/** The six canonical archive pathways, linked to the filtered explorer view. */
const PATHWAYS: {
  slug: DocumentCategory;
  title: string;
  description: string;
  icon: typeof BookOpen;
}[] = [
  {
    slug: "writings",
    title: "Writings",
    description: "Books, essays and periodicals on economics, caste, law and religion.",
    icon: BookOpen,
  },
  {
    slug: "speeches",
    title: "Speeches",
    description: "Addresses and statements preserved as transcripts and reports.",
    icon: Volume2,
  },
  {
    slug: "constitutional-debates",
    title: "Constitutional Debates",
    description: "Constituent Assembly volumes recording the framing of the Republic.",
    icon: Landmark,
  },
  {
    slug: "manuscripts",
    title: "Rare Manuscripts",
    description: "Handwritten drafts, proof sheets, notebooks and letters.",
    icon: ScrollText,
  },
];

export default async function CollectionsPage() {
  const { collections, error } = await fetchCollections();

  // Live counts per canonical category, calculated from the documents table.
  let categoryCounts: Record<string, number | null> = {};
  if (!error) {
    try {
      const { fetchCategoryCounts } = await import("@/lib/server/collection-counts");
      categoryCounts = await fetchCategoryCounts();
    } catch {
      categoryCounts = {};
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Institutional Holdings"
        title="Collections"
        description="Curated pathways into the archive. Item counts are calculated live from the catalogue."
      />

      {error ? (
        <div
          role="alert"
          className="mt-10 rounded-md border border-terracotta/40 bg-terracotta/5 px-5 py-4 text-sm text-terracotta"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PATHWAYS.map(({ slug, title, description, icon: Icon }) => (
          <Link
            key={slug}
            id={slug}
            href={`/explore?category=${slug}`}
            className="group flex flex-col rounded-md border border-border-warm bg-paper p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-saffron/60 hover:shadow-lift"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-sm bg-saffron-soft text-saffron-dark">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-4 font-serif text-xl font-semibold text-navy-deep group-hover:text-saffron-dark">
              {title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-muted">{description}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-navy-soft">
              {categoryCounts[slug] == null ? "—" : `${categoryCounts[slug]} items`} · Browse →
            </p>
          </Link>
        ))}
      </div>

      <section className="mt-16" aria-label="Database collections">
        <h2 className="font-serif text-2xl font-semibold text-navy-deep">
          Curator-defined Collections
        </h2>
        <p className="mt-1 text-sm text-slate-muted">
          Named collections assembled in the archive database.
        </p>
        {!error && collections.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {collections.map((collection) => (
              <li
                key={collection.id}
                className="rounded-md border border-border-warm bg-paper p-5 shadow-card"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-serif text-lg font-semibold text-navy-deep">
                    {collection.name}
                  </h3>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                    {collection.documentCount == null
                      ? "—"
                      : `${collection.documentCount} items`}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-muted">
                  {collection.description}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No curator collections defined"
            description="Collections assembled by the archive team will appear here."
            className="mt-6"
          />
        )}
      </section>
    </div>
  );
}
