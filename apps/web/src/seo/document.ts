import { dirFor } from "@elawyer/i18n";
import { isKnownLocale } from "./catalog";

export function documentLocale(locale: string): { lang: string; dir: "rtl" | "ltr" } {
  const lang = isKnownLocale(locale) ? locale : "ar";
  return { lang, dir: dirFor(lang) };
}
