"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";

import type { ArchiveDocument } from "@/lib/types";
import { CATEGORY_LABELS, cn } from "@/lib/utils";
import { OcrStatusBadge } from "@/components/badges";
import { EmptyState } from "@/components/states";

export interface ArchiveTableAction {
  label: string;
  onClick: (doc: ArchiveDocument) => void;
  danger?: boolean;
  icon?: "archive" | "restore";
}

export function ArchiveTable({
  documents,
  actions = [],
  emptyTitle = "No documents found",
  emptyDescription = "Adjust the filters or add a new archival record to get started.",
}: {
  documents: ArchiveDocument[];
  actions?: ArchiveTableAction[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (documents.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border-warm bg-paper shadow-card">
      <table className="w-full min-w-[820px] text-left text-sm">
        <caption className="sr-only">Archival documents and their metadata status</caption>
        <thead>
          <tr className="border-b border-border-warm bg-parchment text-xs uppercase tracking-wider text-slate-muted">
            <th scope="col" className="px-4 py-3.5 font-semibold">Title</th>
            <th scope="col" className="px-4 py-3.5 font-semibold">Category</th>
            <th scope="col" className="px-4 py-3.5 font-semibold">Year</th>
            <th scope="col" className="px-4 py-3.5 font-semibold">Language</th>
            <th scope="col" className="px-4 py-3.5 font-semibold">OCR</th>
            <th scope="col" className="px-4 py-3.5 font-semibold">Source</th>
            <th scope="col" className="px-4 py-3.5 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className="border-b border-border-warm/70 transition-colors last:border-0 hover:bg-ivory"
            >
              <td className="px-4 py-3.5">
                <Link
                  href={`/documents/${doc.id}`}
                  className="font-semibold text-navy-deep hover:text-saffron-dark"
                >
                  {doc.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate-muted">
                  {doc.documentType} · {doc.metadata.accessionNumber}
                </p>
              </td>
              <td className="px-4 py-3.5 text-navy-soft">{CATEGORY_LABELS[doc.category]}</td>
              <td className="px-4 py-3.5 text-navy-soft">{doc.year}</td>
              <td className="px-4 py-3.5 text-navy-soft">{doc.language}</td>
              <td className="px-4 py-3.5">
                <OcrStatusBadge status={doc.ocrStatus} />
              </td>
              <td className="max-w-[180px] truncate px-4 py-3.5 text-navy-soft" title={doc.metadata.source}>
                {doc.metadata.source}
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/documents?edit=${doc.id}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border-warm text-navy-soft transition-colors hover:border-navy hover:text-navy"
                    title={`Edit ${doc.title}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Edit {doc.title}</span>
                  </Link>
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => action.onClick(doc)}
                      className={cn(
                        "inline-flex h-9 items-center rounded-sm border px-3 text-xs font-semibold transition-colors",
                        action.danger
                          ? "border-terracotta/40 text-terracotta hover:bg-terracotta/10"
                          : "border-border-warm text-navy-soft hover:border-navy hover:text-navy"
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
