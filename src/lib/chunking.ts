/**
 * Text chunking utility.
 *
 * Splits archival text into overlapping-free chunks of roughly `maxLen`
 * characters, preserving paragraph boundaries. Used by the ingestion script
 * and the OCR save flow before embedding.
 */

export interface TextChunk {
  text: string;
  index: number;
}

export function chunkText(text: string, maxLen = 1200): TextChunk[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const para of paragraphs) {
    // Oversized paragraph: split on sentence boundaries.
    if (para.length > maxLen) {
      push();
      const sentences = para.match(/[^.!?]+[.!?]*["'\u2019\u201D]*\s*/g) ?? [para];
      for (const sentence of sentences) {
        if ((current + sentence).length > maxLen) {
          push();
          current = sentence;
        } else {
          current += sentence;
        }
      }
      push();
      continue;
    }
    if ((current + "\n\n" + para).length > maxLen) {
      push();
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  push();

  return chunks.map((text, index) => ({ text, index }));
}
