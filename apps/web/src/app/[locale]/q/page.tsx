import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchView } from "@/components/article-page";
import { isKnownLocale } from "@/seo/catalog";
import { cleanQuery } from "@/seo/copy";
import { buildMetadata } from "@/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { q } = await searchParams;
  if (!isKnownLocale(locale)) return {};
  return buildMetadata(locale, { kind: "top", id: "search" }, cleanQuery(q).length === 0);
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  if (!isKnownLocale(locale)) notFound();
  const { q } = await searchParams;
  return <SearchView locale={locale} query={cleanQuery(q)} />;
}
