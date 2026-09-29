"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Bot,
  CircleAlert,
  ExternalLink,
  Library,
  LoaderCircle,
  Sparkles,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/search-bar";

interface ApiSource {
  documentId: string;
  title: string;
  dateLabel: string;
  documentType: string;
  source: string;
  sourceUrl: string | null;
  locator: string;
  excerpt: string;
  similarity: number;
}

interface ApiResult {
  answer: string;
  sources: ApiSource[];
  grounded: boolean;
  error?: string;
}

/** Demo questions grounded in the records actually present in the archive. */
const SUGGESTED_QUESTIONS = [
  "What happened in the Constituent Assembly session of 26 November 1949?",
  "What did the debate on 17 November 1949 cover?",
  "Which article was taken up for consideration on 8 August 1949?",
  "Summarise the session of 16 September 1949.",
  "What is recorded about the drafting committee's work in August 1949?",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: ApiSource[];
  error?: boolean;
}

function makeId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isResearching]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isResearching) return;

    setMessages((prev) => [...prev, { id: makeId(), role: "user", text: trimmed }]);
    setIsResearching(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const json = (await res.json()) as ApiResult & { error?: string };
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "assistant",
            text: json.error ?? "The assistant service could not be reached.",
            error: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "assistant",
            text: json.error
              ? `${json.error}`
              : json.answer,
            sources: json.sources,
            error: Boolean(json.error),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          text: "The assistant service could not be reached. Please try again shortly.",
          error: true,
        },
      ]);
    } finally {
      setIsResearching(false);
    }
  };

  const isEmpty = messages.length === 0 && !isResearching;

  return (
    <div className="grid overflow-hidden rounded-md border border-border-warm bg-paper shadow-card lg:grid-cols-[1fr_300px]">
      {/* Chat column */}
      <div className="flex h-[640px] flex-col">
        <div className="flex items-center justify-between border-b border-border-warm px-5 py-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-deep">
            <Sparkles className="h-4 w-4 text-saffron" aria-hidden />
            Ask the Archive
          </p>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="rounded-sm border border-border-warm px-3 py-1.5 text-xs font-semibold text-slate-muted transition-colors hover:text-navy"
            >
              New session
            </button>
          ) : null}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-saffron-soft text-saffron-dark">
                <Library className="h-7 w-7" aria-hidden />
              </span>
              <h2 className="mt-4 font-serif text-2xl font-semibold text-navy-deep">
                Ask the Archive
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-muted">
                Pose a research question and the assistant searches the
                archive&rsquo;s indexed records, returning a grounded answer
                with citations to the documents it used.
              </p>
              <div className="mt-6 w-full max-w-xl">
                <SearchBar size="lg" placeholder="Type your research question…" onSubmit={send} />
              </div>
            </div>
          ) : (
            <ul className="grid gap-5" aria-label="Conversation">
              {messages.map((message) => (
                <motion.li
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn("flex gap-3", message.role === "user" && "justify-end")}
                >
                  {message.role === "assistant" ? (
                    <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-ivory">
                      <Bot className="h-4.5 w-4.5" aria-hidden />
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-md px-4 py-3",
                      message.role === "user"
                        ? "bg-navy text-ivory"
                        : message.error
                          ? "border border-terracotta/40 bg-terracotta/5"
                          : "border border-border-warm bg-ivory"
                    )}
                  >
                    {message.error ? (
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-terracotta">
                        <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                        Service unavailable
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                    {message.sources && message.sources.length > 0 ? (
                      <div className="mt-3 grid gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                          Cited records
                        </p>
                        {message.sources.map((source, index) => (
                          <div
                            key={`${source.documentId}-${index}`}
                            className="rounded-md border border-border-warm bg-paper p-3"
                          >
                            <p className="flex items-start justify-between gap-2 text-sm font-semibold text-navy-deep">
                              <span>
                                [{index + 1}] {source.title}
                              </span>
                              <span className="shrink-0 text-xs font-medium text-slate-muted">
                                {Math.round(source.similarity * 100)}% match
                              </span>
                            </p>
                            <p className="mt-0.5 text-xs text-slate-muted">
                              {source.dateLabel} · {source.documentType} · {source.locator}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs italic text-navy-soft">
                              {source.excerpt}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                              <a
                                href={`/documents/${source.documentId}`}
                                className="font-semibold text-saffron-dark hover:underline"
                              >
                                View record →
                              </a>
                              {source.sourceUrl ? (
                                <a
                                  href={source.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-slate-muted hover:text-navy"
                                >
                                  <ExternalLink className="h-3 w-3" aria-hidden />
                                  Official source
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {message.role === "user" ? (
                    <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta text-ivory">
                      <User className="h-4.5 w-4.5" aria-hidden />
                    </span>
                  ) : null}
                </motion.li>
              ))}

              {isResearching ? (
                <li className="flex gap-3">
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-ivory">
                    <LoaderCircle className="h-4.5 w-4.5 animate-spin" aria-hidden />
                  </span>
                  <div className="rounded-md border border-border-warm bg-ivory px-4 py-3">
                    <p className="flex items-center gap-2 text-sm text-slate-muted">
                      <LoaderCircle className="h-4 w-4 animate-spin text-saffron" aria-hidden />
                      Searching the archive index…
                    </p>
                    <div className="mt-3 grid gap-1.5" aria-hidden>
                      <div className="h-2 w-52 animate-pulse rounded-full bg-parchment-dark" />
                      <div className="h-2 w-64 animate-pulse rounded-full bg-parchment-dark" />
                      <div className="h-2 w-40 animate-pulse rounded-full bg-parchment-dark" />
                    </div>
                  </div>
                </li>
              ) : null}
            </ul>
          )}
        </div>

        {!isEmpty ? (
          <div className="border-t border-border-warm px-5 py-4">
            <SearchBar placeholder="Ask a follow-up question…" onSubmit={send} />
          </div>
        ) : null}
      </div>

      {/* Suggested questions sidebar */}
      <aside
        aria-label="Suggested questions"
        className="border-t border-border-warm bg-ivory lg:border-l lg:border-t-0"
      >
        <div className="border-b border-border-warm px-5 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-muted">
            Suggested questions
          </p>
        </div>
        <ul className="grid gap-2 p-4">
          {SUGGESTED_QUESTIONS.map((question) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => void send(question)}
                disabled={isResearching}
                className="flex min-h-12 w-full items-start gap-2.5 rounded-sm border border-border-warm bg-paper px-3.5 py-3 text-left text-sm text-navy-soft transition-colors hover:border-saffron hover:text-navy-deep disabled:opacity-50"
              >
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-saffron-dark" aria-hidden />
                {question}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border-warm px-5 py-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-muted">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron-dark" aria-hidden />
            Answers are generated only from the archive&rsquo;s indexed records
            and cite the passages used. Quoted text comes from the cited
            archival documents.
          </p>
        </div>
      </aside>
    </div>
  );
}
