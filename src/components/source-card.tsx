import Link from "next/link";
import { ArrowUpRight, BookMarked } from "lucide-react";

import type { CitationSource } from "@/lib/types";

export function SourceCard({
  source,
  showLocator = true,
  compact = false,
}: {
  source: CitationSource;
  showLocator?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/documents/${source.documentId}`}
      className="group flex items-start gap-3 rounded-md border border-border-warm bg-paper p-3.5 transition-colors hover:border-saffron/60"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-saffron-soft text-saffron-dark">
        <BookMarked className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={compact ? "text-sm font-semibold leading-snug text-navy-deep" : "font-serif text-sm font-semibold leading-snug text-navy-deep"}>
          {source.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-muted">
          {source.author} · {source.year} · {source.documentType}
          {showLocator && source.locator ? ` · ${source.locator}` : ""}
        </p>
        <p className="mt-0.5 truncate text-xs text-olive">{source.source}</p>
      </div>
      <ArrowUpRight
        className="mt-1 h-4 w-4 shrink-0 text-slate-muted transition-colors group-hover:text-saffron-dark"
        aria-hidden
      />
    </Link>
  );
}
