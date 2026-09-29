import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ScrollText } from "lucide-react";

import { fetchDocumentById, fetchRelatedDocuments } from "@/lib/documents";
import { CATEGORY_LABELS, TYPE_ACCENTS, cn, formatDateLabel } from "@/lib/utils";
import { DocumentCard } from "@/components/document-card";
import { MetadataPanel } from "@/components/metadata-panel";
import { OcrStatusBadge } from "@/components/badges";
import { DocumentTabs } from "./document-tabs";
import { DocumentActions } from "./document-actions";

export default async function DocumentDetailPage({
  params,
}: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const { doc, error } = await fetchDocumentById(id);

  if (!doc) {
    if (error) {
      return (
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-28 text-center">
          <h1 className="font-serif text-2xl font-semibold text-navy-deep">
            Unable to load this record
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-muted">
            The archive could not be reached. Check the connection and reload.
          </p>
          <Link
            href="/explore"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-sm bg-navy px-7 font-semibold text-ivory transition-colors hover:bg-navy-deep"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
            Return to the archive
          </Link>
        </div>
      );
    }
    notFound();
  }

  const accent = TYPE_ACCENTS[doc.documentType];
  const related = await fetchRelatedDocuments(doc, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/explore"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-navy-soft transition-colors hover:text-saffron-dark"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to Archive Explorer
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        {/* Main column */}
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("inline-flex items-center gap-1.5 font-semibold", accent.text)}>
              <span className={cn("h-2 w-2 rounded-full", accent.dot)} aria-hidden />
              {doc.documentType}
            </span>
            <span className="text-slate-muted">·</span>
            <span className="text-slate-muted">{doc.collection ?? CATEGORY_LABELS[doc.category]}</span>
            <span className="text-slate-muted">·</span>
            <span className="text-slate-muted">{doc.dateLabel}</span>
          </div>

          <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight text-navy-deep sm:text-4xl">
            {doc.title}
          </h1>
          <p className="mt-2 text-base text-navy-soft">
            {doc.author}
            {doc.year > 0 ? ` · ${doc.year}` : ""}
          </p>

          {/* Keywords */}
          {doc.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-parchment px-3 py-1 text-xs font-medium text-navy-soft"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <OcrStatusBadge status={doc.ocrStatus} />
          </div>

          {/* Tabs: Original / Full text / Summary */}
          <div className="mt-8">
            <DocumentTabs doc={doc} />
          </div>

          {/* Actions */}
          <div className="mt-8">
            <DocumentActions
              documentId={doc.id}
              title={doc.title}
              author={doc.author}
              year={doc.year > 0 ? doc.year : null}
              summary={doc.summary ?? null}
              content={doc.content ?? null}
              language={doc.language}
            />
          </div>

          {/* Related documents */}
          <section className="mt-14" aria-label="Related documents">
            <h2 className="font-serif text-2xl font-semibold text-navy-deep">
              Related Documents
            </h2>
            <p className="mt-1 text-sm text-slate-muted">
              Other records from the archive.
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {related.length > 0 ? (
                related.map((rel) => <DocumentCard key={rel.id} doc={rel} />)
              ) : (
                <p className="text-sm italic text-slate-muted">
                  No related records found yet.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          <MetadataPanel doc={doc} metadata={doc.metadata} />

          <div className="rounded-md border border-border-warm bg-parchment/60 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-muted">
              Archival source
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-navy-soft">
              {doc.metadata.source}
            </p>
            {doc.sourceUrl ? (
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm bg-paper px-4 text-sm font-semibold text-saffron-dark hover:underline"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                View original archival source
              </a>
            ) : null}

            <dl className="mt-4 grid gap-2 border-t border-border-warm pt-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-muted">Document type</dt>
                <dd className="font-medium text-navy-deep">{doc.documentType}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-muted">Language</dt>
                <dd className="font-medium text-navy-deep">{doc.language}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-muted">Date</dt>
                <dd className="font-medium text-navy-deep">{doc.dateLabel}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-muted">Digitisation date</dt>
                <dd className="font-medium text-navy-deep">Not recorded</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-muted">Record created</dt>
                <dd className="font-medium text-navy-deep">
                  {formatDateLabel(doc.createdAt)}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-muted">Access</dt>
                <dd className="font-medium capitalize text-navy-deep">
                  {doc.status === "published" ? "Public" : doc.status}
                </dd>
              </div>
            </dl>

            <p className="mt-4 inline-flex items-start gap-2 rounded-sm bg-paper px-3 py-2 text-xs font-semibold text-navy-soft">
              <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron-dark" aria-hidden />
              Record metadata reflects the archive database; verify citation
              details against the holding institution.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
