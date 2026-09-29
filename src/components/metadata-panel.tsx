import { CalendarDays, Database, FileText, Languages } from "lucide-react";

import type { ArchivalMetadata, ArchiveDocument } from "@/lib/types";

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  const unrecorded = !value || /not recorded|not assigned|not available/i.test(value);
  return (
    <div className="grid gap-1 border-t border-border-warm pt-3 first:border-0 first:pt-0">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </dt>
      <dd className={unrecorded ? "text-sm italic text-slate-muted" : "text-sm text-navy-deep"}>
        {value || "Not recorded"}
      </dd>
    </div>
  );
}

export function MetadataPanel({
  doc,
  metadata,
  className,
}: {
  doc: ArchiveDocument;
  metadata: ArchivalMetadata;
  className?: string;
}) {
  return (
    <dl className={className}>
      <div className="grid gap-3 rounded-md border border-border-warm bg-paper p-5">
        <Row icon={Database} label="Source" value={metadata.source} />
        <Row icon={FileText} label="Accession number" value={metadata.accessionNumber} />
        <Row icon={CalendarDays} label="Digitised on" value={metadata.digitisedOn} />
        <Row icon={Languages} label="Language" value={doc.language} />
        <div className="grid gap-1 border-t border-border-warm pt-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
            Rights
          </dt>
          <dd className="text-sm text-navy-deep">{metadata.rights}</dd>
        </div>
        <div className="grid gap-1 border-t border-border-warm pt-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
            Provenance
          </dt>
          <dd className="text-sm text-navy-deep">{metadata.provenance}</dd>
        </div>
      </div>
    </dl>
  );
}
