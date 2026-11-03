"use client";

import { translate } from "@elawyer/i18n";
import { useParams } from "next/navigation";

export default function LocaleError({ reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale || "ar";
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">{translate(locale, "errors.busy")}</h1>
        <button type="button" className="mt-4 rounded-xl bg-navy-700 px-4 py-2 text-white" onClick={() => reset()}>{translate(locale, "common.back")}</button>
      </div>
    </main>
  );
}
