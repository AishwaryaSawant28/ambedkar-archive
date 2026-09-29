import { NextResponse } from "next/server";
import { ingestDocument, ingestAllDocuments } from "@/lib/server/ingestion";
import { getAdminClient } from "@/lib/server/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Server-side archival ingestion.
 *
 * POST { documentId }            -> ingest one document
 * POST { all: true }             -> ingest every document with a source_url
 *
 * Requires a matching INGEST_SECRET bearer token (server-side env var) so the
 * endpoint cannot be invoked by anonymous visitors.
 */
export async function POST(request: Request) {
  const secret = process.env.INGEST_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { documentId?: unknown; all?: unknown } = {};
  try {
    body = (await request.json()) as { documentId?: unknown; all?: unknown };
  } catch {
    // empty body treated as invalid
  }

  try {
    if (body.all === true) {
      const result = await ingestAllDocuments();
      return NextResponse.json(result);
    }

    if (typeof body.documentId === "string" && body.documentId) {
      const admin = getAdminClient();
      const { data, error } = await admin
        .from("documents")
        .select("id, title, date, source_url")
        .eq("id", body.documentId)
        .maybeSingle();
      if (error || !data) {
        return NextResponse.json({ error: "Document not found." }, { status: 404 });
      }
      const result = await ingestDocument(data);
      return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    }

    return NextResponse.json(
      { error: "Provide documentId or all:true." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[api/ingest] failed:", err);
    return NextResponse.json(
      { error: "Ingestion failed. Check the server logs." },
      { status: 500 }
    );
  }
}
