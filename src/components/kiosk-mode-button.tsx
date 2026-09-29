"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Maximize, Minimize } from "lucide-react";

import { cn } from "@/lib/utils";

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

function subscribeFullscreen(callback: () => void) {
  document.addEventListener("fullscreenchange", callback);
  document.addEventListener("webkitfullscreenchange", callback);
  return () => {
    document.removeEventListener("fullscreenchange", callback);
    document.removeEventListener("webkitfullscreenchange", callback);
  };
}

function isFullscreenSnapshot() {
  const doc = document as FsDocument;
  return Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement);
}

/**
 * Kiosk Mode toggle using the browser Fullscreen API.
 * Falls back gracefully (button hidden) when the API is unavailable,
 * e.g. inside a non-top-level iframe.
 */
export function KioskModeButton({ className }: { className?: string }) {
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    isFullscreenSnapshot,
    () => false
  );
  const [supported] = useState(() => {
    if (typeof window === "undefined") return true;
    const el = document.documentElement as FsElement;
    return Boolean(document.fullscreenElement !== undefined || el.webkitRequestFullscreen);
  });

  const toggle = useCallback(async () => {
    const el = document.documentElement as FsElement;
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      } else {
        const doc = document as FsDocument;
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by the browser; fail silently.
    }
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFullscreen}
      title={isFullscreen ? "Exit kiosk mode" : "Enter kiosk mode"}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-sm border border-navy/30 px-3 text-sm font-semibold text-navy transition-colors hover:border-saffron hover:text-saffron-dark",
        className
      )}
    >
      {isFullscreen ? (
        <Minimize className="h-4 w-4" aria-hidden />
      ) : (
        <Maximize className="h-4 w-4" aria-hidden />
      )}
      <span className="hidden sm:inline">{isFullscreen ? "Exit Kiosk" : "Kiosk Mode"}</span>
      <span className="sr-only">{isFullscreen ? "Exit kiosk mode" : "Enter kiosk mode"}</span>
    </button>
  );
}
