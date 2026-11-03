"use client";

import { translate } from "@elawyer/i18n";
import type { Locale } from "@elawyer/types";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { capturePage, setAnalyticsChoice } from "@/lib/posthog";
import { isKnownLocale, securityPath } from "@/seo/catalog";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const raw = typeof params.locale === "string" ? params.locale : "ar";
  const locale: Locale = isKnownLocale(raw) ? raw : "ar";
  useEffect(() => {
    void capturePage(window.location.pathname);
  }, []);
  return (
    <>
      {children}
      <div className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <a href={securityPath(locale)} className="inline-flex min-h-11 items-center text-sm font-semibold text-navy-700">
            {translate(locale, "security.title")}
          </a>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white"
            onClick={() => {
              setAnalyticsChoice(true);
              void capturePage(window.location.pathname);
            }}
          >
            {translate(locale, "analytics.allow")}
          </button>
        </div>
      </div>
    </>
  );
}
