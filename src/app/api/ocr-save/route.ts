import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server/admin";
import { embedText } from "@/lib/server/embeddings";
import { chunkText } from "@/lib/chunking";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Save OCR-extracted text into an archive document (server-side only).
 *
 * Creates a new document with ocr_text + content, then chunks and embeds the
 * text into document_chunks so it becomes searchable. Uses the admin client;
 * the public client stays read-only.
 */
export async function POST(request: Request) {
  // Optional shared-secret guard. When INGEST_SECRET is set on the server,
  // saves must present it as a bearer token; unset keeps the demo usable.
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    const body = ((await request.json()) as {
      title?: unknown;
      text?: unknown;
      language?: unknown;
    }) ?? {};

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const language = typeof body.language === "string" ? body.language.trim() : "en";

    if (!text) {
      return NextResponse.json({ error: "OCR text is required." }, { status: 400 });
    }
    if (text.length > 200_000) {
      return NextResponse.json({ error: "OCR text is too long." }, { status: 400 });
    }

    const admin = getAdminClient();

    const finalTitle = title || "Untitled OCR capture";
    const { data, error } = await admin
      .from("documents")
      .insert({
        title: finalTitle,
        document_type: "Manuscript",
        language,
        ocr_status: "processed",
        ocr_text: text,
        content: text,
        access: "public",
        summary: null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[api/ocr-save] insert failed:", error.message);
      return NextResponse.json(
        { error: "Could not save the OCR capture (database unavailable or read-only)." },
        { status: 500 }
      );
    }

    // Chunk + embed for search.
    const chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await embedText(chunks[i].text);
        await admin.from("document_chunks").insert({
          document_id: data.id,
          chunk_text: chunks[i].text,
          page_number: null,
          metadata: {
            chunk_index: i,
            chunk_count: chunks.length,
            document_title: finalTitle,
            origin: "ocr",
          },
          embedding,
        });
      } catch (err) {
        console.error("[api/ocr-save] chunk embed failed:", err);
        break;
      }
    }

    return NextResponse.json({ id: data.id, chunks: chunks.length });
  } catch (err) {
    console.error("[api/ocr-save] failed:", err);
    return NextResponse.json({ error: "Could not save the OCR capture." }, { status: 500 });
  }
}
