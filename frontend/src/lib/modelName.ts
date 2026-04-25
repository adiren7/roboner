import type { ModelConfig } from "../api/client";

export type ParseResult =
  | { ok: true; config: ModelConfig; displayName: string }
  | { ok: false; error: string };

/** Expects a spaCy-style name: lang_type_genre_size (four underscore-separated parts). */
export function parseModelName(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Enter a model name." };
  const parts = trimmed.split("_");
  if (parts.length !== 4) {
    return {
      ok: false,
      error: `Expected exactly 4 parts separated by "_" (e.g. en_core_web_sm), got ${parts.length}.`,
    };
  }
  const [lang, type, genre, size] = parts;
  if (![lang, type, genre, size].every((p) => p.length > 0)) {
    return { ok: false, error: "Each segment must be non-empty." };
  }
  return {
    ok: true,
    displayName: trimmed,
    config: { lang, type, genre, size },
  };
}
