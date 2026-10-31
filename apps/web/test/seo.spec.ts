import { readFileSync } from "fs";
import { join } from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, PUBLISHED_PLANS, type Locale } from "@elawyer/types";
import { ArticlePage, SearchView } from "../src/components/article-page";
import { HomeView } from "../src/components/home-view";
import {
  lighthousePaths,
  pagePath,
  publicPages,
  slugProblems,
  type PageRef,
} from "../src/seo/catalog";
import { localeCoverage } from "../src/seo/copy";
import { documentLocale } from "../src/seo/document";
import { jsonLdFor, publishedOfferPrices, type JsonLd } from "../src/seo/jsonld";
import { buildMetadata } from "../src/seo/metadata";
import { blockedByRobots, PRIVATE_ROBOTS } from "../src/seo/robots-policy";
import { routeLocale } from "../src/seo/routing";
import { buildRobots, buildSitemap } from "../src/seo/sitemap-data";
import { absoluteUrl, siteUrl } from "../src/seo/site";

const BANNED_SEGMENTS = ["app", "wallet", "memos", "saved", "integrations", "admin", "api", "login", "signup", "otp", "forgot", "reset", "pay", "q"];

function titleOf(locale: Locale, page: PageRef): string {
  const title = buildMetadata(locale, page).title;
  return title && typeof title === "object" && "absolute" in title ? String(title.absolute) : "";
}

function languagesOf(locale: Locale, page: PageRef): Record<string, string> {
  return (buildMetadata(locale, page).alternates?.languages || {}) as Record<string, string>;
}

function graphTypes(data: JsonLd): string[] {
  return data["@graph"].map((node) => String(node["@type"]));
}

function segments(url: string): string[] {
  return new URL(url).pathname.split("/").filter(Boolean);
}

describe("public SEO", () => {
  test("slug table and locale copy are complete", () => {
    expect(slugProblems()).toEqual([]);
    expect(localeCoverage()).toEqual([]);
    expect(publicPages()).toHaveLength(21);
  });

  test("SITE_URL is the configured origin", () => {
    expect(siteUrl()).toBe("http://127.0.0.1:4720");
    expect(readFileSync(join(__dirname, "../src/seo/site.ts"), "utf8")).not.toMatch(/example\.(com|invalid|test)/);
    for (const name of ["site.ts", "metadata.ts", "jsonld.ts", "sitemap-data.ts"]) {
      expect(readFileSync(join(__dirname, "../src/seo", name), "utf8")).not.toContain("emuhami.com");
    }
  });

  test("every public page in every locale has metadata, hreflang, and JSON-LD", () => {
    for (const locale of LOCALES) {
      const titles = new Set<string>();
      const descriptions = new Set<string>();
      for (const page of publicPages()) {
        const meta = buildMetadata(locale, page);
        const title = titleOf(locale, page);
        const description = String(meta.description || "");
        expect(title.length).toBeGreaterThan(8);
        expect(description.length).toBeGreaterThan(20);
        expect(titles.has(title)).toBe(false);
        expect(descriptions.has(description)).toBe(false);
        titles.add(title);
        descriptions.add(description);
        expect(meta.alternates?.canonical).toBe(absoluteUrl(pagePath(locale, page)));
        const languages = languagesOf(locale, page);
        expect(Object.keys(languages).sort()).toEqual([...LOCALES, "x-default"].sort());
        for (const code of LOCALES) {
          expect(languages[code]).toBe(absoluteUrl(pagePath(code, page)));
          expect(languages[code].startsWith(siteUrl())).toBe(true);
        }
        expect(languages["x-default"]).toBe(languages.ar);
        expect(languages.ar.includes("/ar/") || languages.ar.endsWith("/ar")).toBe(false);
        const robots = meta.robots as { index?: boolean; follow?: boolean };
        expect(robots.index).toBe(true);
        expect(robots.follow).toBe(true);
        const image = absoluteUrl("/og-image-1200x630.png");
        const og = meta.openGraph as { images?: Array<{ url: string; width: number; height: number; alt: string }>; locale?: string };
        expect(og.images?.[0].url).toBe(image);
        expect(og.images?.[0].width).toBe(1200);
        expect(og.images?.[0].height).toBe(630);
        expect(og.images?.[0].alt).toBe(title);
        if (locale === "ar") expect(og.locale).toBe("ar");
        else expect(og.locale && og.locale.length).toBeGreaterThan(0);
        expect(og.locale).not.toMatch(/ar[-_]SA/);
        const twitter = meta.twitter as { card?: string; images?: string[] };
        expect(twitter.card).toBe("summary_large_image");
        expect(twitter.images?.[0]).toBe(image);
        const data = jsonLdFor(locale, page);
        expect(data["@context"]).toBe("https://schema.org");
        expect(data["@graph"].length).toBeGreaterThan(0);
        for (const node of data["@graph"]) expect(node["@type"]).toBeTruthy();
        expect(graphTypes(data)).toContain("BreadcrumbList");
        expect(graphTypes(data)).toContain("WebPage");
        const crumb = data["@graph"].find((node) => node["@type"] === "BreadcrumbList");
        const items = crumb?.itemListElement as Array<{ position: number; name: string; item: string }>;
        expect(items[0].position).toBe(1);
        expect(items[0].name.length).toBeGreaterThan(0);
        expect(items[0].item.startsWith(siteUrl())).toBe(true);
        expect(JSON.stringify(data)).not.toMatch(/@example\./);
        if (locale !== "ar") expect(titleOf("ar", page)).not.toBe(title);
      }
    }
  });

  test("home, pricing, and FAQ structured data use the published plans", () => {
    for (const locale of LOCALES) {
      const home = jsonLdFor(locale, { kind: "home" });
      expect(graphTypes(home)).toEqual(expect.arrayContaining(["Organization", "WebSite", "SoftwareApplication", "BreadcrumbList"]));
      const site = home["@graph"].find((node) => node["@type"] === "WebSite");
      const action = site?.potentialAction as { "@type": string; target: { urlTemplate: string } };
      expect(action["@type"]).toBe("SearchAction");
      expect(action.target.urlTemplate).toContain("{search_term_string}");
      expect(action.target.urlTemplate.startsWith(siteUrl())).toBe(true);
      const app = home["@graph"].find((node) => node["@type"] === "SoftwareApplication");
      const offers = app?.offers as Array<{ price: string; priceCurrency: string }>;
      expect(offers.map((offer) => offer.price)).toEqual(publishedOfferPrices());
      expect(offers.every((offer) => offer.priceCurrency === "SAR")).toBe(true);
      expect(publishedOfferPrices()).toEqual([
        (PUBLISHED_PLANS.free.priceHalalas / 100).toFixed(2),
        (PUBLISHED_PLANS.basic.priceHalalas / 100).toFixed(2),
        (PUBLISHED_PLANS.pro.priceHalalas / 100).toFixed(2),
      ]);
      const pricing = jsonLdFor(locale, { kind: "top", id: "pricing" });
      const priced = pricing["@graph"].find((node) => node["@type"] === "SoftwareApplication");
      expect((priced?.offers as Array<{ price: string }>).map((offer) => offer.price)).toEqual(publishedOfferPrices());
      const faq = jsonLdFor(locale, { kind: "top", id: "faq" });
      const block = faq["@graph"].find((node) => node["@type"] === "FAQPage");
      const questions = block?.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>;
      expect(questions).toHaveLength(4);
      for (const question of questions) {
        expect(question.name.length).toBeGreaterThan(0);
        expect(question.acceptedAnswer.text.length).toBeGreaterThan(0);
      }
    }
  });

  test("sitemap lists every locale and leaves private routes out", () => {
    const entries = buildSitemap();
    expect(entries).toHaveLength(publicPages().length * LOCALES.length);
    const urls = entries.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const entry of entries) {
      expect(entry.url.startsWith(siteUrl())).toBe(true);
      expect(blockedByRobots(new URL(entry.url).pathname)).toBe(false);
      for (const segment of segments(entry.url)) expect(BANNED_SEGMENTS).not.toContain(segment);
      const languages = entry.alternates?.languages || {};
      expect(Object.keys(languages).sort()).toEqual([...LOCALES, "x-default"].sort());
      expect(languages["x-default"]).toBe(languages.ar);
    }
    const robots = buildRobots();
    expect(robots.sitemap).toBe(absoluteUrl("/sitemap.xml"));
    const rules = Array.isArray(robots.rules) ? robots.rules[0].disallow : robots.rules?.disallow;
    expect(rules).toEqual(expect.arrayContaining(["/app$", "/app/", "/en/app/", "/api/", "/admin$", "/q$"]));
  });

  test("robots blocks private routes and leaves public pages and icons", () => {
    for (const path of ["/app", "/app/wallet", "/app/memos", "/app/saved", "/app/integrations", "/admin", "/api", "/api/health", "/login", "/signup", "/pay", "/pay/result", "/q", "/en/app", "/en/app/wallet", "/ur/app/memos", "/ar/admin", "/hi/q"]) {
      expect(blockedByRobots(path)).toBe(true);
    }
    for (const path of ["/", "/en", "/icon", "/apple-icon", "/og-image-1200x630.png", "/questions", "/en/questions", "/sitemap.xml", "/robots.txt", "/manifest.webmanifest"]) {
      expect(blockedByRobots(path)).toBe(false);
    }
    for (const locale of LOCALES) {
      for (const page of publicPages()) expect(blockedByRobots(pagePath(locale, page))).toBe(false);
    }
  });

  test("private metadata is noindex and the admin console is noindex", () => {
    expect(PRIVATE_ROBOTS.index).toBe(false);
    expect(PRIVATE_ROBOTS.follow).toBe(false);
    expect(PRIVATE_ROBOTS.googleBot.index).toBe(false);
    const session = readFileSync(join(__dirname, "../src/app/[locale]/(session)/layout.tsx"), "utf8");
    expect(session).toContain("PRIVATE_ROBOTS");
    const admin = readFileSync(join(__dirname, "../../admin/src/app/layout.tsx"), "utf8");
    expect(admin).toMatch(/index:\s*false/);
    const adminRobots = readFileSync(join(__dirname, "../../admin/src/app/robots.ts"), "utf8");
    expect(adminRobots).toContain('disallow: "/"');
    const hidden = buildMetadata("en", { kind: "home" }, false);
    expect((hidden.robots as { index: boolean }).index).toBe(false);
  });

  test("locale routing keeps Arabic unprefixed and rewrites search", () => {
    expect(routeLocale("/", undefined)).toEqual({ type: "rewrite", pathname: "/ar", locale: "ar" });
    expect(routeLocale("/الأسعار", undefined).type).toBe("rewrite");
    expect(routeLocale("/ar", undefined)).toEqual({ type: "redirect", pathname: "/", locale: "ar" });
    expect(routeLocale("/ar/الأسعار", undefined)).toEqual({ type: "redirect", pathname: "/الأسعار", locale: "ar" });
    expect(routeLocale("/en", undefined)).toEqual({ type: "next", locale: "en" });
    expect(routeLocale("/en/pricing", undefined)).toEqual({ type: "next", locale: "en" });
    expect(routeLocale("/بحث", undefined)).toEqual({ type: "rewrite", pathname: "/ar/q", locale: "ar" });
    expect(routeLocale("/en/search", undefined)).toEqual({ type: "rewrite", pathname: "/en/q", locale: "en" });
    expect(routeLocale("/en/q", undefined)).toEqual({ type: "redirect", pathname: "/en/search", locale: "en" });
    expect(routeLocale("/signup", undefined)).toEqual({ type: "rewrite", pathname: "/ar/signup", locale: "ar" });
    expect(routeLocale("/signup", "en")).toEqual({ type: "rewrite", pathname: "/en/signup", locale: "en" });
    expect(routeLocale("/", "en")).toEqual({ type: "rewrite", pathname: "/ar", locale: "ar" });
    expect(documentLocale("ar")).toEqual({ lang: "ar", dir: "rtl" });
    expect(documentLocale("en")).toEqual({ lang: "en", dir: "ltr" });
    expect(documentLocale("ur")).toEqual({ lang: "ur", dir: "rtl" });
    expect(documentLocale("pa")).toEqual({ lang: "pa", dir: "rtl" });
    expect(documentLocale("fil")).toEqual({ lang: "fil", dir: "ltr" });
    expect(documentLocale("zz")).toEqual({ lang: "ar", dir: "rtl" });
  });

  test("rendered public pages have one h1, alt text, and valid JSON-LD", () => {
    for (const locale of LOCALES) {
      for (const page of publicPages()) {
        const element =
          page.kind === "home"
            ? createElement(HomeView, { locale })
            : page.kind === "top" && page.id === "search"
              ? createElement(SearchView, { locale, query: "" })
              : createElement(ArticlePage, { locale, page });
        const html = renderToStaticMarkup(element);
        expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
        expect(html).not.toContain("<html");
        const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]);
        expect(scripts.length).toBeGreaterThan(0);
        for (const script of scripts) {
          const data = JSON.parse(script) as JsonLd;
          expect(data["@context"]).toBe("https://schema.org");
          expect(data["@graph"].length).toBeGreaterThan(0);
        }
        const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
        expect(images.length).toBeGreaterThan(0);
        for (const image of images) expect(image).toMatch(/\balt="/);
      }
    }
    expect(readFileSync(join(__dirname, "../next.config.ts"), "utf8")).toContain("htmlLimitedBots");
    const leaked = renderToStaticMarkup(createElement(SearchView, { locale: "en", query: "user@example.com" }));
    const payload = leaked.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || "";
    expect(payload).not.toContain("user@example.com");
    expect(leaked).not.toMatch(/href="[^"]*\/app/);
  });

  test("lighthouse covers every Arabic public page and one home per locale", () => {
    const paths = lighthousePaths();
    for (const page of publicPages()) expect(paths).toContain(pagePath("ar", page));
    for (const locale of LOCALES) {
      if (locale === "ar") continue;
      expect(paths).toContain(pagePath(locale, { kind: "home" }));
    }
    expect(paths).toHaveLength(publicPages().length + LOCALES.length - 1);
  });
});
