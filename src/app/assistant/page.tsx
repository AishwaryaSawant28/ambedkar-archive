import { AssistantChat } from "@/components/assistant-chat";
import { SectionHeading } from "@/components/stats-card";

export const metadata = { title: "AI Research Assistant" };

export default function AssistantPage() {
  return (
    <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Low-opacity Ambedkar archival motif behind the heading — decorative only */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 right-0 hidden h-64 w-64 rounded-full bg-contain bg-center bg-no-repeat opacity-[0.08] lg:block"
        style={{ backgroundImage: "url(/images/ambedkar-motif.svg)" }}
      />
      <SectionHeading
        eyebrow="AI Research Assistant"
        title="Ask the Archive"
        description="A research companion grounded in the archive's own records. Answers arrive with citations to catalogued documents — every claim traceable to a source."
      />
      <p className="mt-3 text-sm italic text-slate-muted">
        Answers are generated only from passages retrieved from this archive
        and are always shown with their sources.
      </p>
      <div className="mt-10">
        <AssistantChat />
      </div>
    </div>
  );
}
