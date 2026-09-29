import Image from "next/image";
import Link from "next/link";
import { Play, Volume2, Video } from "lucide-react";

import type { Collection, MediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCENTS: Record<
  Collection["accent"],
  { chip: string; icon: string; border: string }
> = {
  saffron: {
    chip: "bg-saffron/15 text-saffron-dark",
    icon: "text-saffron",
    border: "hover:border-saffron/60",
  },
  terracotta: {
    chip: "bg-terracotta/10 text-terracotta",
    icon: "text-terracotta",
    border: "hover:border-terracotta/60",
  },
  navy: { chip: "bg-navy/10 text-navy", icon: "text-navy", border: "hover:border-navy/50" },
  olive: { chip: "bg-olive/10 text-olive", icon: "text-olive", border: "hover:border-olive/60" },
  moss: { chip: "bg-moss/10 text-moss", icon: "text-moss", border: "hover:border-moss/60" },
};

export function CollectionCard({ collection }: { collection: Collection }) {
  const accent = ACCENTS[collection.accent];

  return (
    <Link
      id={collection.slug}
      href={`/explore?category=${collection.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-md border border-border-warm bg-paper shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift",
        accent.border
      )}
    >
      <div className="relative h-40 w-full overflow-hidden bg-parchment">
        {collection.coverImage ? (
          <Image
            src={collection.coverImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-xl font-semibold text-navy-deep group-hover:text-saffron-dark">
            {collection.title}
          </h3>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
            {collection.itemCount == null ? "—" : `${collection.itemCount} items`}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-muted">{collection.description}</p>
        <p className="mt-auto pt-2 text-xs font-semibold uppercase tracking-wider text-navy-soft group-hover:text-saffron-dark">
          Browse collection →
        </p>
      </div>
    </Link>
  );
}

export function MediaCard({ item }: { item: MediaItem }) {
  const hasSource = Boolean(item.mediaUrl);
  const kindLabel = item.kindLabel ?? "Media";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-border-warm bg-paper shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative flex h-48 w-full items-center justify-center overflow-hidden bg-navy-deep">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover opacity-90"
            unoptimized
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-ivory/60">
            <Video className="h-10 w-10" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest">
              No thumbnail attached
            </span>
          </span>
        )}
        <span className="absolute left-3 top-3 rounded-sm bg-paper/95 px-2.5 py-1 text-xs font-semibold text-navy-deep">
          {kindLabel}
        </span>
        {item.durationLabel ? (
          <span className="absolute right-3 top-3 rounded-sm bg-navy-deep/90 px-2.5 py-1 text-xs font-semibold text-ivory">
            {item.durationLabel}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-xs text-slate-muted">
          <span>{item.year > 0 ? item.year : "Year not recorded"}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{item.source}</span>
        </div>
        <h3 className="font-serif text-lg font-semibold leading-snug text-navy-deep">
          {item.title}
        </h3>
        <p className="text-sm leading-relaxed text-slate-muted">{item.description}</p>

        <div className="mt-auto pt-2">
          {hasSource ? (
            <a
              href={item.mediaUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-saffron px-4 text-sm font-semibold text-ivory transition-colors hover:bg-saffron-dark"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
              Watch / listen
            </a>
          ) : (
            <p className="inline-flex items-center gap-2 rounded-sm border border-dashed border-border-strong px-3 py-2 text-xs font-semibold text-slate-muted">
              <Play className="h-3.5 w-3.5" aria-hidden />
              Media source not yet attached
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
