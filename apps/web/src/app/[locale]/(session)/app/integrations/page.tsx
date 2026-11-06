"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { userFacingError } from "@/lib/errors";
import { useApp } from "@/lib/providers";

const COPY = {
  google_drive: ["integrations.drive", "integrations.driveBody"],
  onedrive: ["integrations.one", "integrations.oneBody"],
  email: ["integrations.email", "integrations.emailBody"],
  calendar: ["integrations.calendar", "integrations.calendarBody"],
} as const;

export default function IntegrationsPage() {
  const { t, client } = useApp();
  const [items, setItems] = useState<{ provider: string; configured: boolean; connected: boolean; status: string }[] | null>(null);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setFailed(false);
    client.integrations().then((result) => setItems(result.items)).catch(() => {
      setItems(null);
      setFailed(true);
    });
  }, [client, attempt]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("integrations.title")}</h1>
      <p className="text-ink-500">{t("integrations.subtitle")}</p>
      {failed ? (
        <div className="mt-6">
          <p className="text-ink-700">{t("common.error")}</p>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white" onClick={() => setAttempt((value) => value + 1)}>{t("common.retry")}</button>
        </div>
      ) : items === null ? <p className="mt-6 text-ink-500">{t("common.loading")}</p> : (
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const copy = COPY[item.provider as keyof typeof COPY];
          return (
            <article key={item.provider} className="paper rounded-3xl border border-ink-200 p-5 dark:border-white/10">
              <h2 className="font-semibold">{t(copy[0])}</h2>
              <p className="mt-2 text-sm leading-7 text-ink-500">{t(copy[1])}</p>
              <p className="mt-2 text-xs text-ink-400">{item.configured ? (item.connected ? t("integrations.connected") : "") : t("integrations.notConfigured")}</p>
              <Button className="mt-4" variant="secondary" type="button" onClick={async () => {
                try {
                  if (item.provider === "google_drive") {
                    const memos = await client.memos();
                    if (!memos.memos[0]) return;
                    const result = await client.exportDrive(memos.memos[0].id);
                    setNote(result.status === "uploaded" ? `${t("integrations.export")} ${result.externalId}` : t("integrations.stubOk"));
                    return;
                  }
                  const started = await client.startIntegration(item.provider);
                  if (started.url) window.location.href = started.url;
                  else setNote(t("integrations.notConfigured"));
                } catch (err) {
                  setNote(userFacingError(err, t));
                }
              }}>{item.provider === "google_drive" ? t("integrations.export") : t("integrations.connect")}</Button>
            </article>
          );
        })}
      </div>
      )}
      {note ? <p className="mt-4 text-sm text-teal-700">{note}</p> : null}
    </main>
  );
}
