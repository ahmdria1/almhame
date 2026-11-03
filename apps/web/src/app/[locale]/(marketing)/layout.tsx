"use client";

import { useEffect } from "react";
import { capturePage, setAnalyticsChoice } from "@/lib/posthog";
import { translate } from "@elawyer/i18n";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void capturePage(window.location.pathname);
  }, []);
  return (
    <>
      {children}
      <form className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 text-sm" onSubmit={(event) => { event.preventDefault(); setAnalyticsChoice(true); void capturePage(window.location.pathname); }}>
        <p>{translate("ar", "security.title")}</p>
        <button type="submit" className="rounded-xl border border-ink-200 px-3 py-1">{translate("ar", "common.back")}</button>
      </form>
    </>
  );
}
