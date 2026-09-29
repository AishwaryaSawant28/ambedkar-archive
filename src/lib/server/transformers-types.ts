// Minimal structural typing for @xenova/transformers' feature-extraction
// pipeline, avoiding a deep import of the package's internal types.
export interface EmbeddingOutput {
  data: Float32Array | number[];
}

export interface EmbeddingPipeline {
  (text: string, options: { pooling: "mean"; normalize: boolean }): Promise<EmbeddingOutput>;
}
