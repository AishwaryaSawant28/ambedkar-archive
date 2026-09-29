"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, MapPin, X } from "lucide-react";

import type { TimelineEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/states";

const ERAS = [
  { key: "all", label: "All Eras" },
  { key: "early-life", label: "Early Life" },
  { key: "education", label: "Education" },
  { key: "movement", label: "Movement" },
  { key: "constitution", label: "Constitution" },
  { key: "conversion", label: "Conversion" },
  { key: "legacy", label: "Legacy" },
] as const;

type EraKey = (typeof ERAS)[number]["key"];

const ERA_COLORS: Record<TimelineEvent["era"], string> = {
  "early-life": "bg-olive",
  education: "bg-navy",
  movement: "bg-terracotta",
  constitution: "bg-navy-deep",
  conversion: "bg-saffron",
  legacy: "bg-gold",
};

const ERA_LABELS: Record<TimelineEvent["era"], string> = {
  "early-life": "Early Life",
  education: "Education",
  movement: "Movement",
  constitution: "Constitution",
  conversion: "Conversion",
  legacy: "Legacy",
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const [era, setEra] = useState<EraKey>("all");
  const [selected, setSelected] = useState<TimelineEvent | null>(null);

  const filtered = useMemo(
    () => (era === "all" ? events : events.filter((e) => e.era === era)),
    [era, events]
  );

  return (
    <div>
      {/* Era filter — large kiosk-friendly chips */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter timeline by era">
        {ERAS.map((e) => (
          <button
            key={e.key}
            type="button"
            onClick={() => setEra(e.key)}
            aria-pressed={era === e.key}
            className={cn(
              "min-h-11 rounded-full border px-5 text-sm font-semibold transition-colors",
              era === e.key
                ? "border-navy bg-navy text-ivory"
                : "border-border-strong bg-paper text-navy-soft hover:border-saffron hover:text-saffron-dark"
            )}
          >
            {e.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No events in this era"
          description="Try another era filter to continue exploring the timeline."
          className="mt-8"
        />
      ) : (
        <ol className="relative mt-10 grid gap-10 border-l-2 border-border-strong pl-8 sm:pl-12">
          {filtered.map((event, index) => (
            <li key={event.id} className="relative">
              {/* Node marker */}
              <span
                className={cn(
                  "absolute -left-[41px] top-1 h-5 w-5 rounded-full border-4 border-ivory ring-2 ring-border-strong sm:-left-[57px]",
                  ERA_COLORS[event.era]
                )}
                aria-hidden
              />
              <motion.button
                type="button"
                onClick={() => setSelected(event)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2) }}
                className="w-full max-w-3xl rounded-md border border-border-warm bg-paper p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-saffron/60 hover:shadow-lift sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="font-serif text-xl font-semibold text-saffron-dark">
                    {event.dateLabel}
                  </span>
                  <span className="rounded-full bg-parchment px-2.5 py-1 font-semibold text-navy-soft">
                    {ERA_LABELS[event.era]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-muted">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {event.location}
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-xl font-semibold text-navy-deep">
                  {event.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-muted">
                  {event.description}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-navy-soft">
                  View details →
                </p>
              </motion.button>
            </li>
          ))}
        </ol>
      )}

      {/* Detail panel */}
      <AnimatePresence>
        {selected ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-navy-deep/60"
              onClick={() => setSelected(null)}
              aria-hidden
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={`${selected.title} — event details`}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-y-auto bg-paper shadow-panel"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-warm bg-paper/95 px-6 py-4 backdrop-blur-sm">
                <p className="font-serif text-lg font-semibold text-navy-deep">
                  {selected.dateLabel}
                </p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-border-warm text-navy transition-colors hover:border-saffron"
                >
                  <X className="h-5 w-5" aria-hidden />
                  <span className="sr-only">Close event details</span>
                </button>
              </div>

              <div className="flex flex-col gap-6 px-6 py-6">
                {selected.imageUrl ? (
                  <div className="relative h-56 w-full overflow-hidden rounded-md border border-border-warm bg-parchment">
                    <Image
                      src={selected.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 576px"
                      className="object-cover"
                    />
                  </div>
                ) : null}

                <div>
                  <span className="rounded-full bg-parchment px-3 py-1 text-xs font-semibold text-navy-soft">
                    {ERA_LABELS[selected.era]}
                  </span>
                  <h2 className="mt-3 font-serif text-2xl font-semibold text-navy-deep">
                    {selected.title}
                  </h2>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-muted">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    {selected.dateLabel} · {selected.location}
                  </p>
                  <p className="mt-4 leading-relaxed text-navy-soft">{selected.description}</p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-muted">
                    Related documents
                  </h3>
                  {/* The timeline_events schema has no document-relation column, so
                      linked catalogue records render only if a relation is added. */}
                  <p className="mt-3 text-sm italic text-slate-muted">
                    No catalogue records are linked to this event.
                  </p>
                  <Link
                    href="/explore"
                    className="mt-4 inline-flex min-h-11 items-center rounded-sm border border-navy/30 px-5 text-sm font-semibold text-navy transition-colors hover:border-saffron hover:text-saffron-dark"
                  >
                    Browse the full archive
                  </Link>
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function TimelinePreview({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative grid gap-6 border-l-2 border-border-strong pl-8">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className={cn(
              "absolute -left-[41px] top-1 h-4 w-4 rounded-full border-4 border-ivory ring-2 ring-border-strong",
              ERA_COLORS[event.era]
            )}
            aria-hidden
          />
          <Link
            href="/timeline"
            className="block rounded-md border border-transparent p-3 transition-colors hover:border-border-warm hover:bg-paper"
          >
            <p className="font-serif text-lg font-semibold text-saffron-dark">
              {event.dateLabel}
            </p>
            <p className="text-sm font-semibold text-navy-deep">{event.title}</p>
            <p className="mt-0.5 line-clamp-1 text-sm text-slate-muted">{event.description}</p>
          </Link>
        </li>
      ))}
    </ol>
  );
}
