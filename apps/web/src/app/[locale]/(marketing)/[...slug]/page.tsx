import { LOCALES } from "@elawyer/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/article-page";
import { isKnownLocale, publicPages, resolveSlug, slugParts } from "@/seo/catalog";
import { buildMetadata } from "@/seo/metadata";

export const dynamicParams = true;

function decodeSlug(slug: string[]): string[] {
  return slug.map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
}

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    publicPages()
      .filter((page) => page.kind !== "home" && !(page.kind === "top" && page.id === "search"))
      .map((page) => ({ locale, slug: slugParts(locale, page) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isKnownLocale(locale)) return {};
  const page = resolveSlug(locale, decodeSlug(slug));
  if (!page || (page.kind === "top" && page.id === "search")) return {};
  return buildMetadata(locale, page);
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string[] }> }) {
  const { locale, slug } = await params;
  if (!isKnownLocale(locale)) notFound();
  const page = resolveSlug(locale, decodeSlug(slug));
  if (!page || page.kind === "home" || (page.kind === "top" && page.id === "search")) notFound();
  return <ArticlePage locale={locale} page={page} />;
}
