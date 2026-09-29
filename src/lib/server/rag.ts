/**
 * Retrieval-augmented generation pipeline (server-side only).
 *
 * USER QUESTION -> embed (MiniLM 384d) -> Supabase match_chunks() -> grounded
 * context -> OpenRouter chat completion -> answer + citations.
 *
 * The assistant is strictly grounded: if retrieval returns nothing relevant,
 * it says the archive does not contain enough evidence. It never invents
 * quotations, and only quotes text present in retrieved chunks.
 */
import "server-only";

import { createClient } from "@supabase/supabase-js";
import { embedText } from "./embeddings";
import { getAdminClient } from "./admin";

export interface RetrievedChunk {
  documentId: string;
  chunkText: string;
  pageNumber: number | null;
  similarity: number;
  metadata: {
    document_title?: string;
    document_date?: string;
    source_url?: string;
    chunk_index?: number;
  } | null;
}

export interface RagSource {
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

/**
 * Free-tier models verified working for grounded Q&A via OpenRouter
 * (2026-09), tried in order. `openrouter/free` was dropped: it returned
 * HTTP 200 with empty/safety-filter output, producing blank assistant
 * answers. Candidates are retried on 429 and empty output.
 */
const OPENROUTER_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3.8-27b:free",
];

/** Strip reasoning-model artefacts some free providers emit. */
function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\|[^|]*\|>/g, "")
    .trim();
}

/** Detect junk output (e.g. "?????" placeholder runs) some fallback models emit. */
function isGarbled(text: string): boolean {
  const bad = (text.match(/\?|\uFFFD/g) ?? []).length;
  return bad > text.length * 0.25;
}

function openRouterKey(): string | null {
  return process.env.OPENROUTER_API_KEY ?? null;
}

/** Retrieve the most similar archive chunks for a question. */
export async function retrieveChunks(
  question: string,
  matchCount = 6
): Promise<{ chunks: RetrievedChunk[]; error: string | null }> {
  let embedding: number[];
  try {
    embedding = await embedText(question);
  } catch (err) {
    console.error("[rag] embedding failed:", err);
    return { chunks: [], error: "The search index is not available right now." };
  }

  // match_chunks runs under the publishable key — the RPC is callable with
  // the anon role under the existing read policies (verified working).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !pub) {
    return { chunks: [], error: "The search index is not available right now." };
  }
  const readClient = createClient(url, pub, { auth: { persistSession: false } });
  const { data, error } = await readClient.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
  });

  if (error) {
    console.error("[rag] match_chunks failed:", error.message);
    return { chunks: [], error: "The archive retrieval service returned an error." };
  }

  const chunks: RetrievedChunk[] = (data ?? []).map(
    (row: {
      document_id: string;
      chunk_text: string;
      page_number: number | null;
      similarity: number;
      metadata: RetrievedChunk["metadata"];
    }) => ({
      documentId: row.document_id,
      chunkText: row.chunk_text,
      pageNumber: row.page_number,
      similarity: row.similarity,
      metadata: row.metadata ?? null,
    })
  );

  return { chunks, error: null };
}

interface DocInfo {
  title: string | null;
  date: string | null;
  year: number | null;
  document_type: string | null;
  source: string | null;
  source_url: string | null;
}

async function fetchDocInfo(ids: string[]): Promise<Map<string, DocInfo>> {
  const map = new Map<string, DocInfo>();
  if (ids.length === 0) return map;
  const admin = getAdminClient();
  const { data } = await admin
    .from("documents")
    .select("id, title, date, year, document_type, source, source_url")
    .in("id", ids);
  for (const row of data ?? []) {
    map.set(row.id, row);
  }
  return map;
}

function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, i) => {
      const meta = chunk.metadata ?? {};
      const title = meta.document_title ?? `Record ${chunk.documentId}`;
      const date = meta.document_date ? ` (${meta.document_date})` : "";
      return `[${i + 1}] ${title}${date}\n${chunk.chunkText}`;
    })
    .join("\n\n---\n\n");
}

const SYSTEM_PROMPT = `You are the research assistant of a digital heritage archive dedicated to Dr. B. R. Ambedkar, answering questions about the Constituent Assembly Debates of India (1949) and related archival records.

Rules:
- Answer ONLY from the provided archive context. Do not use outside knowledge.
- If the context does not contain enough information, say so plainly: "The available archive records do not contain enough information to answer this."
- Quote only text that appears verbatim in the context. Never invent quotations.
- Cite sources inline using their bracket numbers, e.g. [1], [2].
- Be concise, factual and neutral. Do not add commentary about yourself.

Output format (strict):
- Think silently. Your entire visible reply must be the final answer only.
- Begin your reply with the exact marker FINAL:
- Never output reasoning, planning, phrases like "We need to..." or "Let's...", or any analysis in the reply.`;

const ANSWER_MARKER = "FINAL:";

/**
 * Extract the final answer from a model reply. Reasoning-style free models
 * sometimes prepend chain-of-thought to `content`; the FINAL: marker in the
 * system prompt gives a deterministic split point. Falls back to heuristics
 * when the model omits the marker.
 */
function extractAnswer(raw: string): string {
  let text = stripReasoning(raw);
  const markerIdx = text.indexOf(ANSWER_MARKER);
  if (markerIdx !== -1) {
    text = text.slice(markerIdx + ANSWER_MARKER.length);
  } else {
    // Heuristic fallback: drop leading reasoning sentences ("We need to…",
    // "Let's…", "First…" etc.) when no marker was returned.
    const lines = text.split("\n");
    const start = lines.findIndex(
      (l) => !/^\s*(we need|let's|let us|first|okay|so |i'll|i will|to answer|the question)/i.test(l)
    );
    text = start === -1 ? text : lines.slice(start).join("\n");
  }
  return text.trim();
}

export interface AssistantAnswer {
  answer: string;
  sources: RagSource[];
  grounded: boolean;
  error?: string;
}

/** Full pipeline: question -> retrieval -> grounded OpenRouter answer + citations. */
export async function answerQuestion(
  question: string,
  matchCount = 6
): Promise<AssistantAnswer> {
  const { chunks, error: retrievalError } = await retrieveChunks(question, matchCount);
  if (retrievalError) {
    return { answer: "", sources: [], grounded: false, error: retrievalError };
  }

  // Fetch authoritative document metadata for citations.
  const docInfos = await fetchDocInfo([...new Set(chunks.map((c) => c.documentId))]);

  const sources: RagSource[] = chunks.map((chunk) => {
    const info = docInfos.get(chunk.documentId);
    const meta = chunk.metadata ?? {};
    const title = info?.title ?? meta.document_title ?? "Archive record";
    const dateLabel = info?.date ?? meta.document_date ?? (info?.year ? String(info.year) : "Date not recorded");
    const locator =
      chunk.pageNumber != null
        ? `p. ${chunk.pageNumber}`
        : meta.chunk_index != null
          ? `chunk ${meta.chunk_index + 1}`
          : "—";
    return {
      documentId: chunk.documentId,
      title,
      dateLabel,
      documentType: info?.document_type ?? "Document",
      source: info?.source ?? "Source not recorded",
      sourceUrl: info?.source_url ?? meta.source_url ?? null,
      locator,
      excerpt: chunk.chunkText.slice(0, 280),
      similarity: chunk.similarity,
    };
  });

  if (chunks.length === 0) {
    return {
      answer:
        "The archive index returned no matching passages for this question. The available archive records do not contain enough information to answer it yet — more records may need to be ingested.",
      sources: [],
      grounded: false,
    };
  }

  const key = openRouterKey();
  if (!key) {
    return {
      answer: "",
      sources,
      grounded: false,
      error: "The AI generation service is not configured (missing OPENROUTER_API_KEY). Retrieved sources are shown below.",
    };
  }

  const context = buildContext(chunks);
  const url = "https://openrouter.ai/api/v1/chat/completions";

  let lastError = "The AI generation service could not be reached. Retrieved sources are shown below.";
  for (const model of OPENROUTER_MODELS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 700,
          temperature: 0.2,
          // Keep chain-of-thought models (e.g. Nemotron) from leaking
          // reasoning into the visible answer.
          reasoning: { exclude: true },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Archive context:\n\n${context}\n\nQuestion: ${question}`,
            },
          ],
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[rag] OpenRouter error (${model}):`, res.status, body.slice(0, 300));
        lastError =
          res.status === 429
            ? "The AI generation service is rate-limited right now. Please try again in a moment."
            : "The AI generation service returned an error. Retrieved sources are shown below.";
        continue; // try the next free model
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      };
      // Some providers answer HTTP 200 with an embedded error payload.
      if (json.error?.message) {
        console.error(`[rag] provider error (${model}):`, json.error.message.slice(0, 300));
        lastError = "The AI generation service could not process this question. Retrieved sources are shown below.";
        continue;
      }
      const answer = extractAnswer(json.choices?.[0]?.message?.content ?? "");
      if (!answer || isGarbled(answer)) {
        console.error(`[rag] unusable output (${model})`);
        lastError = "The AI service returned an unusable response. Retrieved sources are shown below.";
        continue;
      }

      return { answer, sources, grounded: true };
    } catch (err) {
      console.error(`[rag] OpenRouter request failed (${model}):`, err);
      lastError = "The AI generation service could not be reached. Retrieved sources are shown below.";
    }
  }

  return { answer: "", sources, grounded: false, error: lastError };
}

/** Semantic search over chunks, returning best chunk per document. */
export async function semanticSearch(
  query: string,
  matchCount = 10
): Promise<{ results: RagSource[]; error: string | null }> {
  const { chunks, error } = await retrieveChunks(query, matchCount);
  if (error) return { results: [], error };

  const docInfos = await fetchDocInfo([...new Set(chunks.map((c) => c.documentId))]);

  // Deduplicate: keep the strongest chunk per document.
  const best = new Map<string, RetrievedChunk>();
  for (const chunk of chunks) {
    const existing = best.get(chunk.documentId);
    if (!existing || chunk.similarity > existing.similarity) {
      best.set(chunk.documentId, chunk);
    }
  }

  const results: RagSource[] = [...best.values()].map((chunk) => {
    const info = docInfos.get(chunk.documentId);
    const meta = chunk.metadata ?? {};
    return {
      documentId: chunk.documentId,
      title: info?.title ?? meta.document_title ?? "Archive record",
      dateLabel: info?.date ?? meta.document_date ?? (info?.year ? String(info.year) : "Date not recorded"),
      documentType: info?.document_type ?? "Document",
      source: info?.source ?? "Source not recorded",
      sourceUrl: info?.source_url ?? meta.source_url ?? null,
      locator:
        chunk.pageNumber != null
          ? `p. ${chunk.pageNumber}`
          : meta.chunk_index != null
            ? `chunk ${meta.chunk_index + 1}`
            : "—",
      excerpt: chunk.chunkText.slice(0, 320),
      similarity: chunk.similarity,
    };
  });

  results.sort((a, b) => b.similarity - a.similarity);
  return { results, error: null };
}
