"use client";

import { useState } from "react";
import { useApp } from "@/lib/providers";

export function ReportButton() {
  const { t, client } = useApp();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  return (
    <>
      <button type="button" className="fixed bottom-4 end-4 z-30 rounded-full bg-navy-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setOpen(true)}>
        {t("report.label")}
      </button>
      {open ? (
        <form
          className="fixed bottom-16 end-4 z-30 w-80 rounded-3xl border border-ink-200 bg-white p-4 shadow-card dark:border-white/10 dark:bg-navy-800"
          onSubmit={(event) => {
            event.preventDefault();
            const message = String(new FormData(event.currentTarget).get("message") || "");
            void client.reportProblem(message).then(() => {
              setNote(t("report.sent"));
              setOpen(false);
            });
          }}
        >
          <label className="text-sm font-semibold">
            {t("report.label")}
            <textarea name="message" required minLength={4} placeholder={t("report.placeholder")} className="mt-2 h-24 w-full rounded-2xl border border-ink-200 p-3 dark:border-white/10 dark:bg-navy-900" />
          </label>
          <button type="submit" className="mt-3 rounded-xl bg-navy-700 px-3 py-2 text-sm font-semibold text-white">{t("common.save")}</button>
        </form>
      ) : null}
      {note ? <p className="fixed bottom-16 end-4 z-30 rounded-2xl bg-white px-3 py-2 text-sm shadow">{note}</p> : null}
    </>
  );
}
