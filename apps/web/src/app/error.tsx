"use client";

import { translate } from "@elawyer/i18n";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">{translate("ar", "errors.busy")}</h1>
        <button type="button" className="mt-4 rounded-xl bg-navy-700 px-4 py-2 text-white" onClick={() => reset()}>{translate("ar", "common.back")}</button>
      </div>
    </main>
  );
}
