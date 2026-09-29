"use client";

import { useState } from "react";

import type { ArchiveDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabKey = "full-text" | "summary";

const TABS: { key: TabKey; label: string }[] = [
  { key: "full-text", label: "Full Text" },
  { key: "summary", label: "Summary" },
];

export function DocumentTabs({ doc }: { doc: ArchiveDocument }) {
  const [active, setActive] = useState<TabKey>("full-text");
  const hasContent = Boolean(doc.content && doc.content.trim().length > 0);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Document views"
        className="flex flex-wrap gap-2 border-b border-border-warm"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={active === tab.key}
            aria-controls={`panel-${tab.key}`}
            onClick={() => setActive(tab.key)}
            className={cn(
              "-mb-px min-h-11 rounded-t-sm border-b-2 px-5 py-3 text-sm font-semibold transition-colors",
              active === tab.key
                ? "border-saffron text-navy-deep"
                : "border-transparent text-slate-muted hover:text-navy-deep"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="pt-6"
      >
        {active === "full-text" ? (
          hasContent ? (
            <div className="rounded-md border border-border-warm bg-paper p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                From the official source ({doc.sourceUrl ? "constitutionofindia.net" : "archival source"})
              </p>
              <div className="mt-4 max-h-[600px] overflow-y-auto whitespace-pre-wrap font-serif text-base leading-relaxed text-navy-soft">
                {doc.content}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border-strong bg-ivory px-5 py-10 text-center">
              <p className="text-sm font-semibold text-navy-deep">
                Full text not yet available from the source.
              </p>
              {doc.sourceUrl ? (
                <a
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-saffron-dark hover:underline"
                >
                  Read at the official source →
                </a>
              ) : null}
            </div>
          )
        ) : null}

        {active === "summary" ? (
          <div className="rounded-md border border-border-warm bg-paper p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
              Summary
            </p>
            {doc.summary ? (
              <p className="mt-4 font-serif text-base leading-relaxed text-navy-soft">
                {doc.summary}
              </p>
            ) : doc.description ? (
              <p className="mt-4 font-serif text-base leading-relaxed text-navy-soft">
                {doc.description}
              </p>
            ) : (
              <p className="mt-4 text-sm italic text-slate-muted">Summary not available.</p>
            )}
            {doc.tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-parchment px-3 py-1 text-xs font-semibold text-navy-soft"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
