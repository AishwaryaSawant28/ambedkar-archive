import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatsCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone = "navy",
  progress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  tone?: "navy" | "saffron" | "olive" | "terracotta";
  /** 0–100; renders a thin progress bar when provided. */
  progress?: number;
}) {
  const tones = {
    navy: "bg-navy/10 text-navy",
    saffron: "bg-saffron/15 text-saffron-dark",
    olive: "bg-olive/10 text-olive",
    terracotta: "bg-terracotta/10 text-terracotta",
  } as const;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border-warm bg-paper p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-sm",
            tones[tone]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <div>
        <p className="font-serif text-3xl font-semibold text-navy-deep">{value}</p>
        <p className="mt-1 text-sm font-semibold text-navy-soft">{label}</p>
        {sublabel ? (
          <p className="mt-0.5 text-xs text-slate-muted">{sublabel}</p>
        ) : null}
      </div>
      {typeof progress === "number" ? (
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} progress`}
          className="h-1.5 w-full overflow-hidden rounded-full bg-parchment-dark"
        >
          <div
            className="h-full rounded-full bg-saffron transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron-dark">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 font-serif text-2xl font-semibold text-navy-deep sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base leading-relaxed text-slate-muted">{description}</p>
      ) : null}
    </div>
  );
}
