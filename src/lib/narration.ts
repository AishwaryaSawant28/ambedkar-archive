"use client";

/**
 * Browser speech narration using the Web Speech Synthesis API.
 * Clearly labelled as browser narration — never as an archival recording.
 */

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopNarration(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export interface NarrationOptions {
  lang?: string;
  rate?: number;
}

/** Speak the given text; returns a stop function. */
export function speak(
  text: string,
  { lang = "en-IN", rate = 0.95 }: NarrationOptions = {},
  onEnd?: () => void
): () => void {
  if (!isSpeechSupported()) return () => undefined;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 20000));
  utterance.lang = lang;
  utterance.rate = rate;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
  return () => window.speechSynthesis.cancel();
}
