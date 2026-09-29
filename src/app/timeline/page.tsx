import { AlertCircle } from "lucide-react";

import { fetchTimelineEvents } from "@/lib/server/archive-tables";
import { Timeline } from "@/components/timeline";
import { SectionHeading } from "@/components/stats-card";
import { EmptyState } from "@/components/states";
import type { TimelineEvent } from "@/lib/types";

export const metadata = { title: "Interactive Timeline" };
export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const { events, error } = await fetchTimelineEvents();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Chronology"
        title="Interactive Timeline"
        description="Milestones from the archive's chronological records — select any event to open its detail panel."
      />
      <div className="mt-10">
        {error ? (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-md border border-terracotta/40 bg-terracotta/5 px-5 py-4 text-sm text-terracotta"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
            {error}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No timeline events yet"
            description="Chronological records have not been added to the archive yet."
            className="mt-2"
          />
        ) : (
          <Timeline events={events} />
        )}
      </div>
    </div>
  );
}

// Re-export for type safety when mapping rows.
export type { TimelineEvent };
