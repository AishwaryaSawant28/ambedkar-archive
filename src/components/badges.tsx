import { Check, CircleDashed, LoaderCircle } from "lucide-react";

import type { OcrStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<
  OcrStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  processed: { label: "Text available", icon: Check, className: "bg-moss/15 text-moss" },
  pending: {
    label: "Processing queued",
    icon: LoaderCircle,
    className: "bg-saffron-soft text-saffron-dark",
  },
  none: {
    label: "Text not yet ingested",
    icon: CircleDashed,
    className: "bg-parchment text-slate-muted",
  },
  not_started: {
    label: "Text not yet ingested",
    icon: CircleDashed,
    className: "bg-parchment text-slate-muted",
  },
};

export function OcrStatusBadge({ status }: { status: OcrStatus }) {
  const entry = STATUS_MAP[status] ?? STATUS_MAP.not_started;
  const Icon = entry.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        entry.className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {entry.label}
    </span>
  );
}

export function ConditionBadge({ condition }: { condition: string }) {
  if (condition === "Not recorded") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-parchment px-2.5 py-1 text-xs font-semibold text-slate-muted">
        <CircleDashed className="h-3.5 w-3.5" aria-hidden />
        Condition: not recorded
      </span>
    );
  }
  const fragile = condition === "Fragile" || condition === "Fair";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        fragile ? "bg-terracotta/10 text-terracotta" : "bg-olive/10 text-olive"
      )}
    >
      Condition: {condition}
    </span>
  );
}
