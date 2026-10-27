import type { MetadataRoute } from "next";
import { LOCALES } from "@elawyer/types";
import { pagePath, publicPages } from "./catalog";
import { languageAlternates } from "./metadata";
import { robotDisallow } from "./robots-policy";
import { absoluteUrl } from "./site";

export function buildSitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    publicPages().map((page) => ({
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
