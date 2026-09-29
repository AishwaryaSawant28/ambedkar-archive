import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const LANGUAGES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

const MAX_CHARS = 6000;

/**
 * Free-tier models verified working for translation via OpenRouter
 * (2026-09), tried in order. `openrouter/free` was dropped: it returned
 * HTTP 200 with empty/safety-filter output, so no translation could ever
 * surface. Each model is retried on 429 before falling through.
 */
const OPENROUTER_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3.8-27b:free",
];
const MODEL_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

/** Strip reasoning-model artefacts some free providers emit. */
function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\|[^|]*\|>/g, "")
    .trim();
}

/**
 * Detect junk output (e.g. "?????" placeholder runs or U+FFFD replacement
 * characters) that some fallback models emit for non-Latin scripts.
 */
function isGarbled(text: string): boolean {
  const bad = (text.match(/\?|\uFFFD/g) ?? []).length;
  return bad > text.length * 0.25;
}

export async function POST(request: Request) {
  let text = "";
  let targetLang = "";
  try {
    const body = (await request.json()) as { text?: unknown; targetLang?: unknown };
    if (typeof body.text === "string") text = body.text.trim();
    if (typeof body.targetLang === "string") targetLang = body.targetLang;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Text to translate is required." }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS);
  }

  const target = LANGUAGES[targetLang];
  if (!target) {
    return NextResponse.json(
      { error: "Unsupported language. Use en, hi or mr." },
      { status: 400 }
    );
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Translation is not configured (missing OPENROUTER_API_KEY on the server)." },
      { status: 503 }
    );
  }

  // Anti-hallucination contract: bind the output to the input. Weak models
  // otherwise invent a fluent but wrong translation for unseen scripts.
  const systemPrompt =
    "You are a careful translator for a digital heritage archive. Translate the user's text " +
    `into ${target}. Preserve paragraph breaks, names and archaic phrasing. ` +
    "Your reply must be a translation of the user's text — it must contain the same " +
    "information. Do not answer it, summarize it, or replace it with unrelated text. " +
    "If you cannot translate it, reply with the original text unchanged. " +
    "Output ONLY the translation — no commentary, no notes.";

  const url = "https://openrouter.ai/api/v1/chat/completions";
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let lastError = "The translation service could not be reached.";

  // Free-tier models are per-model rate-limited: retry the same model before
  // falling through to the next candidate.
  for (const model of OPENROUTER_MODELS) {
    for (let attempt = 0; attempt < MODEL_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 3000,
          temperature: 0.1,
          // Keep chain-of-thought models (e.g. Nemotron) from leaking
          // reasoning into the translation.
          reasoning: { exclude: true },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
        }),
        signal: AbortSignal.timeout(90_000),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[api/translate] OpenRouter error (${model}):`, res.status, errBody.slice(0, 300));
        lastError =
          res.status === 429
            ? "The translation service is rate-limited right now. Please try again in a moment."
            : "The translation service returned an error. Please try again later.";
        if (res.status === 429) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        break;
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      };
      // Some providers answer HTTP 200 with an embedded error payload.
      if (json.error?.message) {
        console.error(`[api/translate] provider error (${model}):`, json.error.message.slice(0, 300));
        lastError = "The translation service could not process this text. Please try again later.";
        break;
      }
      const translated = stripReasoning(json.choices?.[0]?.message?.content ?? "");
      if (!translated || isGarbled(translated)) {
        console.error(`[api/translate] unusable output (${model})`);
        lastError = "The translation service returned an unusable result for this text. Please try again or try a shorter passage.";
        break;
      }

      return NextResponse.json({ translated, targetLang });
    } catch (err) {
      console.error(`[api/translate] request failed (${model}):`, err);
      lastError = "The translation service could not be reached.";
    }
    }
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}
