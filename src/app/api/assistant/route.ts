import { NextResponse } from "next/server";
import { answerQuestion } from "@/lib/server/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let question = "";
  try {
    const body = (await request.json()) as { question?: unknown };
    if (typeof body.question === "string") {
      question = body.question.trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  if (question.length > 1000) {
    return NextResponse.json({ error: "Question is too long." }, { status: 400 });
  }

  try {
    const result = await answerQuestion(question);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/assistant] failed:", err);
    return NextResponse.json(
      { error: "The assistant service is temporarily unavailable." },
      { status: 500 }
    );
  }
}
