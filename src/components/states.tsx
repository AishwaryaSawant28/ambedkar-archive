import type { LucideIcon } from "lucide-react";
import { CircleAlert, LoaderCircle, SearchX } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border-strong bg-paper px-6 py-16 text-center",
        className
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-parchment text-slate-muted">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-serif text-lg font-semibold text-navy-deep">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-slate-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <LoaderCircle className="h-8 w-8 animate-spin text-saffron" aria-hidden />
      <p className="text-sm font-medium text-slate-muted">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-terracotta/40 bg-terracotta/5 px-6 py-12 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
        <CircleAlert className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-serif text-lg font-semibold text-navy-deep">{title}</p>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-slate-muted">{description}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex h-11 items-center rounded-sm bg-navy px-6 text-sm font-semibold text-ivory transition-colors hover:bg-navy-deep"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
