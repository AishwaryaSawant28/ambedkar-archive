import { NextResponse } from "next/server";
import { semanticSearch } from "@/lib/server/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let query = "";
  try {
    const body = (await request.json()) as { query?: unknown };
    if (typeof body.query === "string") query = body.query.trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "A search query is required." }, { status: 400 });
  }
  if (query.length > 500) {
    return NextResponse.json({ error: "Query is too long." }, { status: 400 });
  }

  try {
    const { results, error } = await semanticSearch(query);
    if (error) {
      return NextResponse.json({ error }, { status: 503 });
    }
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[api/semantic-search] failed:", err);
    return NextResponse.json(
      { error: "Semantic search is temporarily unavailable." },
      { status: 500 }
    );
  }
}
