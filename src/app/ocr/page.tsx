"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  FileUp,
  LoaderCircle,
  RotateCcw,
  Save,
  Volume2,
} from "lucide-react";
import { createWorker } from "tesseract.js";

import { speak, stopNarration, isSpeechSupported } from "@/lib/narration";
import { cn } from "@/lib/utils";

const OCR_LANGUAGES = [
  { value: "eng", label: "English" },
  { value: "hin", label: "Hindi" },
  { value: "mar", label: "Marathi" },
];

/** Map OCR language to speech narration language. */
const NARRATION_LANG: Record<string, string> = { eng: "en-IN", hin: "hi-IN", mar: "mr-IN" };

type Status = "idle" | "working" | "done" | "error";

export default function OcrPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [ocrLang, setOcrLang] = useState("eng");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [narrating, setNarrating] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      stopNarration();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const processFile = async (file: File) => {
    setError(null);
    setText("");
    setCopied(false);
    setSaveState("idle");
    setSaveMessage(null);
    setFileName(file.name);
    setStatus("working");
    setProgress(0);

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setImageUrl(url);

    try {
      const worker = await createWorker(ocrLang, 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgressLabel("Recognising text");
            setProgress(m.progress);
          } else if (m.status === "loading language traineddata") {
            setProgressLabel("Loading language data");
            setProgress(m.progress * 0.5);
          }
        },
      });
      const { data } = await worker.recognize(file);
      const extracted = (data.text ?? "").trim();
      await worker.terminate();

      if (!extracted) {
        setStatus("error");
        setError("No readable text was found in this image. Try a clearer scan.");
        return;
      }
      setText(extracted);
      setStatus("done");
    } catch (err) {
      console.error("[ocr] failed:", err);
      setStatus("error");
      setError("Text extraction failed. The browser OCR engine could not process this file.");
    }
  };

  const onPick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void processFile(file);
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard access was blocked by the browser.");
    }
  };

  const reset = () => {
    stopNarration();
    setNarrating(false);
    setStatus("idle");
    setText("");
    setFileName(null);
    setImageUrl(null);
    setError(null);
    setProgress(0);
    setSaveState("idle");
    setSaveMessage(null);
  };

  const narrate = () => {
    if (narrating) {
      stopNarration();
      setNarrating(false);
      return;
    }
    speak(text, { lang: NARRATION_LANG[ocrLang] ?? "en-IN" }, () => setNarrating(false));
    setNarrating(true);
  };

  const saveToArchive = async () => {
    setSaveState("saving");
    setSaveMessage(null);
    try {
      const res = await fetch("/api/ocr-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fileName ? `OCR capture — ${fileName}` : "OCR capture",
          text,
          language: ocrLang === "eng" ? "en" : ocrLang === "hin" ? "hi" : "mr",
        }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setSaveState("error");
        setSaveMessage(json.error ?? "Could not save the capture.");
        return;
      }
      setSaveState("saved");
      setSaveMessage("Saved to the archive as a new catalogue record.");
    } catch {
      setSaveState("error");
      setSaveMessage("The save service could not be reached.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron-dark">
          OCR Workspace
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-navy-deep sm:text-4xl">
          Manuscript Transcription
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-muted">
          Upload a scan and extract its text directly in your browser — files
          are not uploaded to any external service. Correct the output, then
          copy it or save it into the archive.
        </p>
      </header>

      {/* Language selection */}
      <div className="mt-8 flex flex-wrap items-end gap-4">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
            OCR language
          </span>
          <select
            value={ocrLang}
            onChange={(event) => setOcrLang(event.target.value)}
            disabled={status === "working"}
            className="h-12 rounded-sm border border-border-strong bg-ivory px-3 text-sm font-medium text-navy-deep"
          >
            {OCR_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status === "idle" ? (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            onPick(event.dataTransfer.files);
          }}
          className="mt-6 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border-strong bg-paper px-6 py-20 text-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-saffron-soft text-saffron-dark">
            <FileUp className="h-7 w-7" aria-hidden />
          </span>
          <p className="mt-4 font-serif text-xl font-semibold text-navy-deep">
            Upload a manuscript or image
          </p>
          <p className="mt-1 max-w-md text-sm text-slate-muted">
            Drag a scanned page here, or choose a file. TIFF, JPEG and PNG
            scans are supported.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-sm bg-navy px-7 font-semibold text-ivory transition-colors hover:bg-navy-deep"
          >
            <FileUp className="h-5 w-5" aria-hidden />
            Choose file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => onPick(event.target.files)}
          />
        </div>
      ) : (
        <div className="mt-6">
          {status === "working" ? (
            <div className="rounded-md border border-border-warm bg-paper p-6" role="status">
              <p className="flex items-center gap-2 font-semibold text-navy-deep">
                <LoaderCircle className="h-4 w-4 animate-spin text-saffron" aria-hidden />
                Extracting text from {fileName}…
              </p>
              <div
                className="mt-4 h-2 w-full overflow-hidden rounded-full bg-parchment-dark"
                role="progressbar"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-saffron transition-all"
                  style={{ width: `${Math.max(5, Math.round(progress * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-muted">
                {progressLabel || "Working"} — the browser OCR engine
                initialises on first use, which can take a moment.
              </p>
            </div>
          ) : null}

          {status === "error" ? (
            <div
              role="alert"
              className="rounded-md border border-terracotta/40 bg-terracotta/5 px-5 py-4 text-sm text-terracotta"
            >
              {error}
            </div>
          ) : null}

          {status === "done" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Original image panel */}
              <section aria-label="Original scan">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-muted">
                  Original scan — {fileName}
                </h2>
                <div className="mt-3 overflow-hidden rounded-md border border-border-warm bg-parchment">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Uploaded scan" className="max-h-[420px] w-full object-contain" />
                  ) : null}
                </div>
              </section>

              {/* Extracted text panel */}
              <section aria-label="Extracted text">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-muted">
                    Extracted text (editable)
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={copyText}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-border-warm px-3 text-xs font-semibold text-navy-soft transition-colors hover:border-navy hover:text-navy"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-moss" aria-hidden />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {copied ? "Copied" : "Copy text"}
                    </button>
                    {isSpeechSupported() ? (
                      <button
                        type="button"
                        onClick={narrate}
                        aria-pressed={narrating}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-border-warm px-3 text-xs font-semibold text-navy-soft transition-colors hover:border-navy hover:text-navy"
                      >
                        <Volume2 className="h-3.5 w-3.5" aria-hidden />
                        {narrating ? "Stop narration" : "Browser narration"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <label htmlFor="ocr-text" className="sr-only">
                  Extracted text, editable
                </label>
                <textarea
                  id="ocr-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={16}
                  className="mt-3 w-full rounded-md border border-border-strong bg-paper p-4 font-mono text-sm leading-relaxed text-navy-deep shadow-card"
                />
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveToArchive}
                    disabled={saveState === "saving" || !text.trim()}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-sm px-5 text-sm font-semibold shadow-card transition-colors",
                      saveState === "saved"
                        ? "bg-moss text-ivory"
                        : "bg-terracotta text-ivory hover:bg-terracotta/90"
                    )}
                  >
                    {saveState === "saving" ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden />
                    )}
                    {saveState === "saved" ? "Saved to Archive" : "Save to Archive"}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex min-h-11 items-center gap-2 rounded-sm border-2 border-navy px-5 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-ivory"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Start another capture
                  </button>
                </div>
                {saveMessage ? (
                  <p
                    className={cn(
                      "mt-3 text-sm",
                      saveState === "error" ? "text-terracotta" : "text-olive"
                    )}
                  >
                    {saveMessage}
                  </p>
                ) : null}
                {saveState === "saved" ? (
                  <p className="mt-1 text-xs text-slate-muted">
                    The capture is saved as a new record; view it in{" "}
                    <Link href="/admin/documents" className="font-semibold text-navy-soft underline">
                      Archive Management
                    </Link>
                    .
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
      )}

    </div>
  );
}
