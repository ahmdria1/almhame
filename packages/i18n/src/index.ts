import { LOCALES, type Locale } from "@elawyer/types";
import ar from "./locales/ar.json";
import en from "./locales/en.json";
import ur from "./locales/ur.json";
import hi from "./locales/hi.json";
import pa from "./locales/pa.json";
import si from "./locales/si.json";
import bn from "./locales/bn.json";
import ne from "./locales/ne.json";
import fil from "./locales/fil.json";
import tr from "./locales/tr.json";
import am from "./locales/am.json";

export type Dictionary = Record<string, string>;

export const dictionaries: Record<Locale, Dictionary> = {
  ar,
  en,
  ur,
  hi,
  pa,
  si,
  bn,
  ne,
  fil,
  tr,
  am,
};

const RTL = new Set<string>(["ar", "ur", "pa"]);

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: string): "rtl" | "ltr" {
  return RTL.has(locale) ? "rtl" : "ltr";
}

export const LANGUAGE_NAMES: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
  ur: "اردو",
  hi: "हिन्दी",
  pa: "پنجابی",
  si: "සිංහල",
  bn: "বাংলা",
  ne: "नेपाली",
  fil: "Filipino",
  tr: "Türkçe",
  am: "አማርኛ",
};

export function translate(
  locale: string,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const pack = isLocale(locale) ? dictionaries[locale] : dictionaries.ar;
  let text = pack[key] ?? dictionaries.ar[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function flattenKeys(dict: Dictionary): string[] {
  return Object.keys(dict).sort();
}
