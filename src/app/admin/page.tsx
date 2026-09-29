import {
  Archive,
  Database,
  FileStack,
  HardDrive,
  Plus,
  ScanText,
  ShieldAlert,
  Upload,
} from "lucide-react";

import { fetchArchiveCounts } from "@/lib/server/archive-tables";
import { fetchCategoryCounts } from "@/lib/server/collection-counts";
import { StatsCard, SectionHeading } from "@/components/stats-card";

export const metadata = { title: "Archive Dashboard" };
export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/admin/documents", label: "Manage documents", icon: FileStack },
  { href: "/ocr", label: "OCR workspace", icon: ScanText },
  { href: "/admin/documents?new=1", label: "Add document", icon: Plus },
  { href: "/explore", label: "Review published records", icon: Upload },
];

export default async function AdminPage() {
  const [counts, categoryCounts] = await Promise.all([
    fetchArchiveCounts(),
    fetchCategoryCounts(),
  ]);

  const statCards = [
    {
      icon: Archive,
      label: "Total documents",
      value: counts.totalDocuments,
      sublabel: "in the catalogue",
    },
    {
      icon: ScanText,
      label: "Manuscripts",
      value: counts.manuscripts,
      sublabel: "manuscript records",
    },
    {
      icon: Database,
      label: "Media records",
      value: counts.mediaItems,
      sublabel: "audio-visual catalogue",
    },
    {
      icon: HardDrive,
      label: "Indexed passages",
      value: counts.chunksIndexed,
      sublabel: "embedded text chunks",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-sm bg-gold/20 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-navy-deep">
          <ShieldAlert className="h-4 w-4" aria-hidden />
          Prototype workspace
        </span>
        <p className="text-sm text-navy-soft">
          Demo administration for the archive database. Privileged writes run
          through secured server routes; no authentication system is attached in
          this build.
        </p>
      </div>

      <SectionHeading
        eyebrow="Institutional Dashboard"
        title="Archive Operations"
        description="Live catalogue statistics from the archive database."
      />

      <section aria-label="Collection statistics" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatsCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value == null ? "—" : String(stat.value)}
            sublabel={stat.sublabel}
            tone="navy"
          />
        ))}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-md border border-border-warm bg-paper p-6 shadow-card">
          <h3 className="font-serif text-xl font-semibold text-navy-deep">
            Records by Collection
          </h3>
          <ul className="mt-4 grid gap-3">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <li
                key={category}
                className="flex items-center justify-between gap-3 border-b border-border-warm pb-2 last:border-0"
              >
                <span className="text-sm font-medium capitalize text-navy-soft">
                  {category.replace(/-/g, " ")}
                </span>
                <span className="text-sm font-semibold text-navy-deep">
                  {count ?? "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-muted">
            Text ingestion status (full archival text extracted from official
            sources) is managed via the ingestion endpoint; counts here reflect
            the live catalogue.
          </p>
        </div>

        <div className="rounded-md border border-border-warm bg-paper p-6 shadow-card">
          <h3 className="font-serif text-xl font-semibold text-navy-deep">Quick Actions</h3>
          <ul className="mt-4 grid gap-3">
            {QUICK_ACTIONS.map((action) => (
              <li key={action.label}>
                <a
                  href={action.href}
                  className="flex min-h-12 items-center gap-3 rounded-sm border border-border-warm bg-ivory px-4 text-sm font-semibold text-navy transition-colors hover:border-saffron/60 hover:text-saffron-dark"
                >
                  <action.icon className="h-4.5 w-4.5" aria-hidden />
                  {action.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
