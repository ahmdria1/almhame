import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";
import { isKnownLocale } from "@/seo/catalog";
import { buildMetadata } from "@/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isKnownLocale(locale)) return {};
  return buildMetadata(locale, { kind: "home" });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isKnownLocale(locale)) notFound();
  return <HomeView locale={locale} />;
}
