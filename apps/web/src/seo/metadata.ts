import { LOCALES, type Locale } from "@elawyer/types";
import type { Metadata } from "next";
import { type PageRef, pagePath } from "./catalog";
import { pageCopy } from "./copy";
import { PRIVATE_ROBOTS } from "./robots-policy";
import { absoluteUrl } from "./site";

const OG_LOCALE: Record<Locale, string> = {
  ar: "ar_SA",
  en: "en_US",
  ur: "ur_PK",
  hi: "hi_IN",
  pa: "pa_PK",
  si: "si_LK",
  bn: "bn_BD",
  ne: "ne_NP",
  fil: "fil_PH",
  tr: "tr_TR",
  am: "am_ET",
};

export function languageAlternates(page: PageRef): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = absoluteUrl(pagePath(locale, page));
  languages["x-default"] = absoluteUrl(pagePath("ar", page));
  return languages;
}

export function buildMetadata(locale: Locale, page: PageRef, index = true): Metadata {
  const copy = pageCopy(locale, page);
  const canonical = absoluteUrl(pagePath(locale, page));
  const image = absoluteUrl("/opengraph-image");
  const languages = languageAlternates(page);
  return {
    title: { absolute: copy.title },
    description: copy.description,
    alternates: { canonical, languages },
    robots: index
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : PRIVATE_ROBOTS,
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: copy.title.split("|").pop()?.trim() || copy.title,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((item) => item !== locale).map((item) => OG_LOCALE[item]),
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: copy.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [image],
    },
  };
}

export { PRIVATE_ROBOTS };
