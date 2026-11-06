import type { MetadataRoute } from "next";
import { LOCALES } from "@elawyer/types";
import { type PageRef, pagePath, publicPages } from "./catalog";
import { listLaws } from "./laws";
import { languageAlternates } from "./metadata";
import { robotDisallow } from "./robots-policy";
import { absoluteUrl } from "./site";

export function indexablePages(): PageRef[] {
  return [...publicPages(), ...listLaws().map((law) => ({ kind: "law" as const, id: law.key }))];
}

export function buildSitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    indexablePages().map((page) => ({
      url: absoluteUrl(pagePath(locale, page)),
      changeFrequency: page.kind === "home" ? "weekly" : "monthly",
      priority: page.kind === "home" ? 1 : 0.7,
      alternates: { languages: languageAlternates(page) },
    })),
  );
}

export function buildRobots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: robotDisallow() },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
