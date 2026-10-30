import { LOCALES, type Locale } from "@elawyer/types";

const URDU = /[پچژگٹڈڑںے]/;
const BENGALI = /[\u0980-\u09FF]/;
const DEVANAGARI = /[\u0900-\u097F]/;
const ARABIC = /[\u0600-\u06FF]/;
const GURMUKHI = /[\u0A00-\u0A7F]/;
const SINHALA = /[\u0D80-\u0DFF]/;
const ETHIOPIC = /[\u1200-\u137F]/;
const TURKISH = /[ığüşöçİĞÜŞÖÇ]/;

export function asLocale(value: string | null | undefined): Locale {
  if (value && (LOCALES as readonly string[]).includes(value)) return value as Locale;
  return "ar";
}

export function detectClientLanguage(text: string, fallback?: string | null): Locale {
  if (BENGALI.test(text)) return "bn";
  if (GURMUKHI.test(text)) return "pa";
  if (SINHALA.test(text)) return "si";
  if (ETHIOPIC.test(text)) return "am";
  if (DEVANAGARI.test(text)) return asLocale(fallback) === "ne" ? "ne" : "hi";
  if (URDU.test(text)) return "ur";
  if (ARABIC.test(text)) return "ar";
  if (TURKISH.test(text)) return "tr";
  const hint = asLocale(fallback);
  if (/[A-Za-z]/.test(text)) {
    if (hint === "tr" || hint === "fil" || hint === "en") return hint;
    return "en";
  }
  return hint;
}

export function scriptOf(locale: Locale): RegExp {
  if (locale === "ar" || locale === "ur" || locale === "pa") return /[\u0600-\u06FF]/;
  if (locale === "bn") return BENGALI;
  if (locale === "hi" || locale === "ne") return DEVANAGARI;
  if (locale === "si") return SINHALA;
  if (locale === "am") return ETHIOPIC;
  if (locale === "tr") return /[A-Za-zığüşöçİĞÜŞÖÇ]/;
  return /[A-Za-z]/;
}
