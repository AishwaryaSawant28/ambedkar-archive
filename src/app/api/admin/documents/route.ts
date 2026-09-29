import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server/admin";

export const runtime = "nodejs";

/**
 * Admin document management (server-side writes only).
 *
 * The public publishable client stays read-only under existing RLS. These
 * privileged operations run through the SUPABASE_SECRET_KEY admin client and
 * are gated by the ADMIN_SECRET bearer token (server-side env var).
 *
 * POST   -> create document
 * PATCH  -> update metadata fields (title, summary, ocr_status, etc.)
 * DELETE -> delete document
 */

function checkAuth(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = clean(body.title);
    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const admin = getAdminClient();
    const insert = {
      title,
      description: clean(body.description),
      author: clean(body.author),
      year: typeof body.year === "number" ? body.year : null,
      date: clean(body.date),
      document_type: clean(body.document_type),
      language: clean(body.language),
      collection: clean(body.collection),
      keywords: Array.isArray(body.keywords)
        ? body.keywords.filter((k): k is string => typeof k === "string" && k.trim().length > 0)
        : null,
      source: clean(body.source),
      source_url: clean(body.source_url),
      content: clean(body.content),
      summary: clean(body.summary),
      ocr_status: clean(body.ocr_status) ?? "none",
      access: clean(body.access) ?? "public",
    };

    const { data, error } = await admin.from("documents").insert(insert).select("id").single();
    if (error) {
      console.error("[api/admin/documents] insert failed:", error.message);
      return NextResponse.json({ error: "Could not create the document." }, { status: 500 });
    }
    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[api/admin/documents] POST failed:", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = clean(body.id);
    if (!id) {
      return NextResponse.json({ error: "Document id is required." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    const fields = [
      "title",
      "description",
      "author",
      "date",
      "document_type",
      "language",
      "collection",
      "source",
      "source_url",
      "content",
      "summary",
      "ocr_status",
      "access",
    ] as const;
    for (const field of fields) {
      if (field in body) {
        updates[field] = clean(body[field]);
      }
    }
    if (typeof body.year === "number" || body.year === null) updates.year = body.year;
    if (Array.isArray(body.keywords)) {
      updates.keywords = body.keywords.filter(
        (k): k is string => typeof k === "string" && k.trim().length > 0
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin.from("documents").update(updates).eq("id", id);
    if (error) {
      console.error("[api/admin/documents] update failed:", error.message);
      return NextResponse.json({ error: "Could not update the document." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/documents] PATCH failed:", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "Document id is required." }, { status: 400 });
    }

    const admin = getAdminClient();
    // Remove dependent chunks first, then the document.
    const delChunks = await admin.from("document_chunks").delete().eq("document_id", id);
    if (delChunks.error) {
      console.error("[api/admin/documents] chunk delete failed:", delChunks.error.message);
      return NextResponse.json({ error: "Could not delete document chunks." }, { status: 500 });
    }
    const { error } = await admin.from("documents").delete().eq("id", id);
    if (error) {
      console.error("[api/admin/documents] delete failed:", error.message);
      return NextResponse.json({ error: "Could not delete the document." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/documents] DELETE failed:", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
