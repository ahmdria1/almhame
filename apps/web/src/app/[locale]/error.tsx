"use client";

import { useParams } from "next/navigation";
import { publicLine } from "@/lib/public-copy";

export default function LocaleError({ reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === "string" ? params.locale : "ar";
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">{publicLine(locale, "errors.busy")}</h1>
        <button type="button" className="mt-4 rounded-xl bg-navy-700 px-4 py-2 text-white" onClick={() => reset()}>{publicLine(locale, "common.back")}</button>
      </div>
    </main>
  );
}
