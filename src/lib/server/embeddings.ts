/**
 * Embedding utilities (server-side only).
 *
 * Uses @xenova/transformers with all-MiniLM-L6-v2, which produces
 * 384-dimensional embeddings — matching the existing
 * `match_chunks(query_embedding vector(384), match_count int)` function and
 * the `document_chunks.embedding vector(384)` column. The vector dimension is
 * NOT changed.
 *
 * The model is loaded lazily and cached in module scope, so it downloads once
 * per server process and never runs in the browser.
 */
import "server-only";

import type { EmbeddingPipeline } from "./transformers-types";

export const EMBEDDING_DIMENSIONS = 384;
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

let pipelinePromise: Promise<EmbeddingPipeline> | null = null;

async function loadPipeline(): Promise<EmbeddingPipeline> {
  const { pipeline } = await import("@xenova/transformers");
  const pipe = await pipeline("feature-extraction", EMBEDDING_MODEL);
  return pipe as unknown as EmbeddingPipeline;
}

function getPipeline(): Promise<EmbeddingPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = loadPipeline().catch((err) => {
      pipelinePromise = null;
      throw err;
    });
  }
  return pipelinePromise;
}

/** Generate a normalised 384-dimensional embedding for a piece of text. */
export async function embedText(text: string): Promise<number[]> {
  const pipe = await getPipeline();
  const output = await pipe(text.slice(0, 8000), { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

/** Generate embeddings for several texts sequentially (keeps memory flat). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const text of texts) {
    out.push(await embedText(text));
  }
  return out;
}
