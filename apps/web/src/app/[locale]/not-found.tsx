import { headers } from "next/headers";
import type { Metadata } from "next";
import { isKnownLocale } from "@/seo/catalog";
import { COPY } from "@/seo/copy";
import { PRIVATE_ROBOTS } from "@/seo/robots-policy";

export const metadata: Metadata = {
  title: { absolute: "404" },
  robots: PRIVATE_ROBOTS,
};

export default async function NotFound() {
  const headerStore = await headers();
  const raw = headerStore.get("x-elw-locale") || "ar";
  const locale = isKnownLocale(raw) ? raw : "ar";
  return (
    <main id="content" className="mx-auto max-w-xl px-4 py-20">
      <h1 className="text-3xl font-bold text-navy-700">{COPY.notFound[locale]}</h1>
    </main>
  );
}
