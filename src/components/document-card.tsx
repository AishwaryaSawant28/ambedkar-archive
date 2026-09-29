import Image from "next/image";
import Link from "next/link";
import { AudioLines, BookOpen, ImageIcon, Landmark, ScrollText, Video } from "lucide-react";

import type { ArchiveDocument, DocumentCategory } from "@/lib/types";
import { CATEGORY_LABELS, TYPE_ACCENTS, cn, formatDateLabel } from "@/lib/utils";
import { OcrStatusBadge } from "@/components/badges";

export const CATEGORY_ICONS: Record<DocumentCategory, typeof BookOpen> = {
  writings: BookOpen,
  speeches: AudioLines,
  "constitutional-debates": Landmark,
  manuscripts: ScrollText,
  photographs: ImageIcon,
  media: Video,
};

export function DocumentCard({
  doc,
  showOcrStatus = false,
  className,
}: {
  doc: ArchiveDocument;
  showOcrStatus?: boolean;
  className?: string;
}) {
  const accent = TYPE_ACCENTS[doc.documentType];
  const Icon = CATEGORY_ICONS[doc.category];

  return (
    <Link
      href={`/documents/${doc.id}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-md border border-border-warm bg-paper shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift",
        className
      )}
    >
      <div className="relative h-44 w-full overflow-hidden bg-parchment">
        {doc.imageUrl ? (
          <Image
            src={doc.imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-muted">
            <Icon className="h-10 w-10" aria-hidden />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm bg-paper/95 px-2.5 py-1 text-xs font-semibold text-navy-deep">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {CATEGORY_LABELS[doc.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-xs">
          <span className={cn("h-2 w-2 rounded-full", accent.dot)} aria-hidden />
          <span className={cn("font-semibold", accent.text)}>{doc.documentType}</span>
          <span className="text-slate-muted">·</span>
          <span className="text-slate-muted">{doc.dateLabel}</span>
        </div>

        <h3 className="font-serif text-lg font-semibold leading-snug text-navy-deep group-hover:text-saffron-dark">
          {doc.title}
        </h3>

        <p className="line-clamp-2 text-sm leading-relaxed text-slate-muted">
          {doc.excerpt}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-muted">
          <span>{doc.language}</span>
          {showOcrStatus ? (
            <OcrStatusBadge status={doc.ocrStatus} />
          ) : (
            <span>{formatDateLabel(doc.metadata.digitisedOn)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
