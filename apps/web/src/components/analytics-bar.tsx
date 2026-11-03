"use client";

import { useEffect } from "react";
import { capturePage, setAnalyticsChoice } from "@/lib/posthog";

export function AnalyticsBar({ title, action }: { title: string; action: string }) {
  useEffect(() => {
    void capturePage(window.location.pathname);
  }, []);
  return (
    <form
      className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setAnalyticsChoice(true);
        void capturePage(window.location.pathname);
      }}
    >
      <p>{title}</p>
      <button type="submit" className="rounded-xl border border-ink-200 px-3 py-1">{action}</button>
    </form>
  );
}
