"use client";

import { useEffect, useState } from "react";
import {
  BookmarkPlus,
  BookmarkCheck,
  Languages,
  LoaderCircle,
  StopCircle,
  Volume2,
} from "lucide-react";

import { isSaved, removeItem, saveItem } from "@/lib/research-storage";
import { isSpeechSupported, speak, stopNarration } from "@/lib/narration";
import { cn } from "@/lib/utils";

const TRANSLATION_TARGETS = [
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
  { value: "en", label: "English" },
];

export function DocumentActions({
  documentId,
  title,
  author,
  year,
  summary,
  content,
  language,
}: {
  documentId: string;
  title: string;
  author: string | null;
  year: number | null;
  summary: string | null;
  content: string | null;
  language: string;
}) {
  const [saved, setSaved] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const [showTranslate, setShowTranslate] = useState(false);
  const [targetLang, setTargetLang] = useState("hi");
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const [researchToast, setResearchToast] = useState<string | null>(null);

  useEffect(() => {
    // Defer to a task so no setState happens synchronously in the effect body.
    const id = window.setTimeout(() => {
      setSpeechSupported(isSpeechSupported());
      setSaved(isSaved(documentId));
    }, 0);
    return () => {
      window.clearTimeout(id);
      stopNarration();
    };
  }, [documentId]);

  const toggleSave = () => {
    if (saved) {
      removeItem(documentId);
      setSaved(false);
      setResearchToast("Removed from My Research.");
    } else {
      saveItem({ documentId, title, author, year, folder: "Saved records" });
      setSaved(true);
      setResearchToast("Saved to My Research (stored in this browser).");
    }
    window.setTimeout(() => setResearchToast(null), 3500);
  };

  const toggleNarration = () => {
    if (narrating) {
      stopNarration();
      setNarrating(false);
      return;
    }
    const text = content || summary || "";
    if (!text) return;
    const langMap: Record<string, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
    speak(text, { lang: langMap[language] ?? "en-IN" }, () => setNarrating(false));
    setNarrating(true);
  };

  const runTranslate = async () => {
    setTranslating(true);
    setTranslateError(null);
    setTranslated(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: (summary ?? content ?? "").slice(0, 6000),
          targetLang,
        }),
      });
      const json = (await res.json()) as { translated?: string; error?: string };
      if (!res.ok || !json.translated) {
        setTranslateError(json.error ?? "Translation failed.");
      } else {
        setTranslated(json.translated);
      }
    } catch {
      setTranslateError("The translation service could not be reached.");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setShowTranslate((v) => !v)}
          aria-expanded={showTranslate}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border-2 border-navy px-5 font-semibold text-navy transition-colors hover:bg-navy hover:text-ivory"
        >
          <Languages className="h-5 w-5" aria-hidden />
          Translate
        </button>
        <button
          type="button"
          onClick={toggleNarration}
          disabled={!speechSupported || (!content && !summary)}
          aria-pressed={narrating}
          title={
            speechSupported
              ? "Browser narration of the record text (generated audio, not an archival recording)"
              : "Speech narration is not available in this browser"
          }
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border-2 border-navy px-5 font-semibold text-navy transition-colors hover:bg-navy hover:text-ivory disabled:cursor-not-allowed disabled:opacity-50"
        >
          {narrating ? (
            <StopCircle className="h-5 w-5" aria-hidden />
          ) : (
            <Volume2 className="h-5 w-5" aria-hidden />
          )}
          {narrating ? "Stop narration" : "Listen"}
        </button>
        <button
          type="button"
          onClick={toggleSave}
          className={cn(
            "inline-flex min-h-12 items-center justify-center gap-2 rounded-sm px-5 font-semibold shadow-card transition-colors",
            saved ? "bg-moss text-ivory" : "bg-terracotta text-ivory hover:bg-terracotta/90"
          )}
        >
          {saved ? (
            <BookmarkCheck className="h-5 w-5" aria-hidden />
          ) : (
            <BookmarkPlus className="h-5 w-5" aria-hidden />
          )}
          {saved ? "Saved to Research" : "Add to My Research"}
        </button>
      </div>

      {/* Narration disclosure */}
      {narrating ? (
        <p className="mt-2 text-xs text-slate-muted">
          Browser narration — generated speech reading the record text. This is
          not an archival audio recording.
        </p>
      ) : null}

      {/* Translation panel */}
      {showTranslate ? (
        <div className="mt-4 rounded-md border border-border-warm bg-paper p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                Translate into
              </span>
              <select
                value={targetLang}
                onChange={(event) => setTargetLang(event.target.value)}
                className="h-11 rounded-sm border border-border-strong bg-ivory px-3 text-sm font-medium text-navy-deep"
              >
                {TRANSLATION_TARGETS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={runTranslate}
              disabled={translating || !(summary || content)}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-navy px-5 text-sm font-semibold text-ivory transition-colors hover:bg-navy-deep disabled:opacity-50"
            >
              {translating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Languages className="h-4 w-4" aria-hidden />
              )}
              {translating ? "Translating…" : "Translate"}
            </button>
          </div>

          {translateError ? (
            <p role="alert" className="mt-3 text-sm text-terracotta">
              {translateError}
            </p>
          ) : null}

          {translated ? (
            <div className="mt-4 grid gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  Original
                </p>
                <p className="mt-1 max-h-40 overflow-y-auto text-sm leading-relaxed text-navy-soft">
                  {summary ?? content}
                </p>
              </div>
              <div className="border-t border-border-warm pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  AI-generated translation
                </p>
                <p className="mt-1 text-xs italic text-slate-muted">
                  Machine-translated for research assistance — not an official
                  archival translation.
                </p>
                <p className="mt-1 max-h-60 overflow-y-auto text-sm leading-relaxed text-navy-deep">
                  {translated}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {researchToast ? (
        <p role="status" className="mt-2 text-sm text-olive">
          {researchToast}
        </p>
      ) : null}
    </div>
  );
}

