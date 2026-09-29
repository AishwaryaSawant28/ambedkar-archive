"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function SearchBar({
  placeholder = "Search the archive — writings, speeches, debates, manuscripts…",
  size = "md",
  onSubmit,
  className,
}: {
  placeholder?: string;
  size?: "md" | "lg";
  onSubmit?: (query: string) => void;
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (onSubmit) {
      onSubmit(trimmed);
    } else if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn("flex w-full", className)}
    >
      <label htmlFor={size === "lg" ? "global-search-lg" : "global-search"} className="sr-only">
        Search the archive
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-muted"
          aria-hidden
        />
        <input
          id={size === "lg" ? "global-search-lg" : "global-search"}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-l-sm border border-r-0 border-border-strong bg-paper text-ink placeholder:text-slate-muted/70",
            size === "lg"
              ? "h-16 pl-14 pr-4 text-lg"
              : "h-12 pl-12 pr-4 text-base"
          )}
        />
      </div>
      <button
        type="submit"
        className={cn(
          "rounded-r-sm bg-navy font-semibold text-ivory transition-colors hover:bg-navy-deep",
          size === "lg" ? "h-16 px-8 text-lg" : "h-12 px-5"
        )}
      >
        Search
      </button>
    </form>
  );
}
