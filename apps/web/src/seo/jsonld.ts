import { translate } from "@elawyer/i18n";
import { PLAN_CODES, PUBLISHED_PLANS, type Locale } from "@elawyer/types";
import { type PageRef, pagePath } from "./catalog";
import { brandName, pageCopy } from "./copy";
import { absoluteUrl } from "./site";

const FAQ = ["1", "2", "3", "4"] as const;

const PLAN_NAME: Record<(typeof PLAN_CODES)[number], string> = {
  free: "plans.freeName",
  basic: "plans.basicName",
  pro: "plans.proName",
  office: "plans.officeName",
};

function price(halalas: number): string {
  return (halalas / 100).toFixed(2);
}

export interface JsonLd {
  "@context": "https://schema.org";
  "@graph": Array<Record<string, unknown>>;
}

export function organizationId(): string {
  return `${absoluteUrl("/")}#organization`;
}

export function websiteId(locale: Locale): string {
  return `${absoluteUrl(pagePath(locale, { kind: "home" }))}#website`;
}

function breadcrumb(locale: Locale, page: PageRef): Record<string, unknown> {
  const copy = pageCopy(locale, page);
  return {
    "@type": "BreadcrumbList",
    itemListElement: copy.crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

function offers(locale: Locale): Array<Record<string, unknown>> {
  const pricing = absoluteUrl(pagePath(locale, { kind: "top", id: "pricing" }));
  return PLAN_CODES.map((code) => ({
    "@type": "Offer",
    name: translate(locale, PLAN_NAME[code]),
    price: price(PUBLISHED_PLANS[code].priceHalalas),
    priceCurrency: "SAR",
    availability: "https://schema.org/InStock",
    url: pricing,
  }));
}

export function jsonLdFor(locale: Locale, page: PageRef): JsonLd {
  const copy = pageCopy(locale, page);
  const canonical = absoluteUrl(pagePath(locale, page));
  const home = absoluteUrl(pagePath(locale, { kind: "home" }));
  const brand = brandName(locale);
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: copy.title,
      description: copy.description,
      inLanguage: locale,
      isPartOf: { "@id": websiteId(locale) },
    },
    breadcrumb(locale, page),
  ];
  if (page.kind === "home") {
    graph.unshift(
      {
        "@type": "Organization",
        "@id": organizationId(),
        name: brand,
        url: absoluteUrl("/"),
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId(locale),
        name: brand,
        url: home,
        inLanguage: locale,
        publisher: { "@id": organizationId() },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${absoluteUrl(pagePath(locale, { kind: "top", id: "search" }))}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: brand,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: canonical,
        offers: offers(locale),
        description: copy.description,
      },
    );
  }
  if (page.kind === "top" && page.id === "faq") {
    graph.push({
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: translate(locale, `landing.q${item}`),
        acceptedAnswer: { "@type": "Answer", text: translate(locale, `landing.a${item}`) },
      })),
    });
  }
  if (page.kind === "top" && page.id === "pricing") {
    graph.push({
      "@type": "SoftwareApplication",
      name: brand,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: home,
      offers: offers(locale),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function jsonLdScript(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function publishedOfferPrices(): string[] {
  return PLAN_CODES.map((code) => price(PUBLISHED_PLANS[code].priceHalalas));
}
