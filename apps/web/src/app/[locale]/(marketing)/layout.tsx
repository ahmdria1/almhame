import { translate } from "@elawyer/i18n";
import type { Locale } from "@elawyer/types";
import { AnalyticsBar } from "@/components/analytics-bar";
import { isKnownLocale, securityPath } from "@/seo/catalog";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isKnownLocale(raw) ? raw : "ar";
  return (
    <>
      {children}
      <AnalyticsBar
        title={translate(locale, "security.title")}
        href={securityPath(locale)}
        action={translate(locale, "analytics.allow")}
      />
    </>
  );
}
