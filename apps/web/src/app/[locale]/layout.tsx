import { translate } from "@elawyer/i18n";
import { LOCALES } from "@elawyer/types";
import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { isKnownLocale } from "@/seo/catalog";
import { documentLocale } from "@/seo/document";
import { siteUrl } from "@/seo/site";
import "../globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin", "latin-ext"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-cairo",
  adjustFontFallback: true,
  preload: true,
});

export const viewport: Viewport = {
  themeColor: "#17345F",
  width: "device-width",
  initialScale: 1,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const safe = isKnownLocale(locale) ? locale : "ar";
  return {
    metadataBase: new URL(siteUrl()),
    applicationName: translate(safe, "app.name"),
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
      apple: [{ url: "/apple-icon", sizes: "180x180" }],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const doc = documentLocale(locale);
  return (
    <html lang={doc.lang} dir={doc.dir} className={cairo.variable}>
      <body className={`${cairo.className} min-h-full bg-canvas text-ink-900`}>{children}</body>
    </html>
  );
}
