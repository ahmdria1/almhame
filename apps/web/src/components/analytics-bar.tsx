"use client";

import { useEffect } from "react";
import { capturePage, setAnalyticsChoice } from "@/lib/posthog";

export function AnalyticsBar({ title, href, action }: { title: string; href: string; action: string }) {
  useEffect(() => {
    void capturePage(window.location.pathname);
  }, []);
  return (
    <div className="border-t border-ink-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <a href={href} className="inline-flex min-h-11 items-center text-sm font-semibold text-navy-700">
          {title}
        </a>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white"
          onClick={() => {
            setAnalyticsChoice(true);
            void capturePage(window.location.pathname);
          }}
        >
          {action}
        </button>
      </div>
    </div>
  );
}
