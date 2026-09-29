import { Film, Mic, MonitorPlay, Video } from "lucide-react";

import type { MediaItem } from "@/lib/types";
import { fetchMediaItems } from "@/lib/server/archive-tables";
import { MediaCard } from "@/components/collection-card";
import { SectionHeading } from "@/components/stats-card";
import { EmptyState } from "@/components/states";

export const metadata = { title: "Audio-Visual Archive" };
export const dynamic = "force-dynamic";

const SECTION_ORDER = ["video", "audio", "documentary"] as const;

function groupLabel(kind: string | undefined): string {
  const lower = (kind ?? "").toLowerCase();
  if (lower.includes("audio")) return "audio";
  if (lower.includes("documentary")) return "documentary";
  return "video";
}

export default async function MediaPage() {
  const { items, error } = await fetchMediaItems();

  const grouped = new Map<string, MediaItem[]>();
  for (const item of items) {
    const key = groupLabel(item.kindLabel ?? item.kind);
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Audio-Visual Archive"
        title="Recordings & Film"
        description="Catalogued audio-visual records alongside the paper archive. Media sources are shown when attached to the record."
      />

      {error ? (
        <div
          role="alert"
          className="mt-10 rounded-md border border-terracotta/40 bg-terracotta/5 px-5 py-4 text-sm text-terracotta"
        >
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No media records yet"
          description="Audio and video records will appear here as they are catalogued."
          className="mt-10"
        />
      ) : (
        SECTION_ORDER.map((section) => {
          const sectionItems = grouped.get(section) ?? [];
          if (sectionItems.length === 0) return null;
          const Icon = section === "audio" ? Mic : section === "documentary" ? Film : Video;
          const title =
            section === "audio" ? "Audio" : section === "documentary" ? "Documentaries" : "Video";
          return (
            <section key={section} className="mt-14" aria-label={title}>
              <div className="flex items-center gap-3 border-b border-border-warm pb-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-navy/10 text-navy">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-navy-deep">{title}</h2>
                  <p className="text-sm text-slate-muted">
                    {sectionItems.length} catalogued record{sectionItems.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sectionItems.map((item) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Reserved group when the media table has no documentaries yet */}
      {items.length > 0 && !grouped.has("documentary") ? (
        <section className="mt-14" aria-label="Documentaries">
          <div className="flex items-center gap-3 border-b border-border-warm pb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-navy/10 text-navy">
              <MonitorPlay className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-semibold text-navy-deep">Documentaries</h2>
              <p className="text-sm text-slate-muted">No documentary records catalogued yet.</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
