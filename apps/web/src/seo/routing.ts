import { type Locale } from "@elawyer/types";
import { isKnownLocale, pagePath, resolveSlug, slug } from "./catalog";

export type Decision =
  | { type: "redirect"; pathname: string; locale: Locale }
  | { type: "rewrite"; pathname: string; locale: Locale }
  | { type: "next"; locale: Locale };

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isArabicPublic(parts: string[]): boolean {
  if (parts.length === 0) return true;
  return resolveSlug("ar", parts) !== null;
}

export function routeLocale(pathname: string, cookieLocale: string | undefined): Decision {
  const segments = pathname.split("/").filter(Boolean).map(decodePart);
  const explicit = segments.length > 0 && isKnownLocale(segments[0]) ? segments[0] : null;
  const rest = explicit ? segments.slice(1) : segments;
  const cookie = cookieLocale && isKnownLocale(cookieLocale) ? cookieLocale : null;
  const locale: Locale = explicit ?? (isArabicPublic(rest) ? "ar" : cookie ?? "ar");

  if (rest.length === 1 && rest[0] === "q") {
    return { type: "redirect", pathname: pagePath(locale, { kind: "top", id: "search" }), locale };
  }
  if (explicit === "ar") {
    return { type: "redirect", pathname: rest.length ? `/${rest.join("/")}` : "/", locale: "ar" };
  }
  if (rest.length === 1 && rest[0] === slug(locale, "search")) {
    return { type: "rewrite", pathname: `/${locale}/q`, locale };
  }
  if (explicit) return { type: "next", locale: explicit };
  const target = `/${locale}${rest.length ? `/${rest.join("/")}` : ""}`;
  return { type: "rewrite", pathname: target, locale };
}
