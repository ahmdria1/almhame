import { LOCALES, type Locale } from "@elawyer/types";

export const TRANSLATION_LOCALES = LOCALES.filter((locale) => locale !== "ar");

export function translationPrompt(locale: string, text: string): string {
  return [
    `Translate the following Arabic text into ${locale}.`,
    "Preserve numbers, personal names, and placeholders such as {name} exactly.",
    "Keep legal terms accurate.",
    "Do not add commentary or a second language.",
    'Return JSON {"text":"..."} only.',
    text,
  ].join("\n");
}

export function placeholdersOf(text: string): string[] {
  return [...text.matchAll(/\{[a-zA-Z0-9_]+\}/g)].map((match) => match[0]).sort();
}

export function placeholdersKept(source: string, translated: string): boolean {
  return placeholdersOf(source).join() === placeholdersOf(translated).join();
}

export function parseTranslation(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { text?: string };
    const text = parsed.text?.trim() || "";
    return text || null;
  } catch {
    const match = body.match(/"text"\s*:\s*"([\s\S]*?)"/);
    return match?.[1]?.trim() || null;
  }
}

export function isTranslationLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
