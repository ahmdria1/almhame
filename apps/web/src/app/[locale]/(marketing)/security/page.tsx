import { LOCALES, type Locale } from "@elawyer/types";
import { translate } from "@elawyer/i18n";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safe = (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : "ar";
  const page = { kind: "home" as const };
  return (
    <div className="bg-canvas">
      <PublicHeader locale={safe} page={page} />
      <main id="content" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-16 outline-none">
        <h1 className="text-4xl font-bold text-navy-700">{translate(safe, "security.title")}</h1>
        <p className="mt-6 text-lg leading-8 text-ink-700">{translate(safe, "security.body")}</p>
      </main>
      <PublicFooter locale={safe} />
    </div>
  );
}
