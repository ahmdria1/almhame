import { translate } from "@elawyer/i18n";
import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import { isKnownLocale } from "@/seo/catalog";
import { COPY } from "@/seo/copy";
import { PRIVATE_ROBOTS } from "@/seo/robots-policy";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const safe = isKnownLocale(locale) ? locale : "ar";
  return {
    title: { absolute: translate(safe, "app.name") },
    robots: PRIVATE_ROBOTS,
  };
}

export default async function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safe = isKnownLocale(locale) ? locale : "ar";
  return (
    <Providers>
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-navy-700 focus:px-4 focus:py-2 focus:text-white">
        {COPY.skip[safe]}
      </a>
      <div id="content">{children}</div>
    </Providers>
  );
}
