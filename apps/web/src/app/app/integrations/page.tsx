"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { useApp } from "@/lib/providers";

const COPY = {
  google_drive: ["integrations.drive", "integrations.driveBody"],
  onedrive: ["integrations.one", "integrations.oneBody"],
  email: ["integrations.email", "integrations.emailBody"],
  calendar: ["integrations.calendar", "integrations.calendarBody"],
} as const;

export default function IntegrationsPage() {
  const { t, client } = useApp();
  const [items, setItems] = useState<{ provider: string; configured: boolean; connected: boolean; status: string }[]>([]);
  const [note, setNote] = useState("");
  useEffect(() => { client.integrations().then((result) => setItems(result.items)).catch(() => undefined); }, [client]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("integrations.title")}</h1>
      <p className="text-ink-500">{t("integrations.subtitle")}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const copy = COPY[item.provider as keyof typeof COPY];
          return (
            <article key={item.provider} className="paper rounded-3xl border border-ink-200 p-5 dark:border-white/10">
              <h2 className="font-semibold">{t(copy[0])}</h2>
              <p className="mt-2 text-sm leading-7 text-ink-500">{t(copy[1])}</p>
              <p className="mt-2 text-xs text-ink-400">{item.configured ? (item.connected ? t("integrations.connected") : "") : t("integrations.notConfigured")}</p>
              <Button className="mt-4" variant="secondary" type="button" onClick={async () => {
                if (item.provider === "google_drive") {
                  const memos = await client.memos();
                  if (!memos.memos[0]) return;
                  const result = await client.exportDrive(memos.memos[0].id);
                  setNote(`${t("integrations.stubOk")} ${result.externalId}`);
                  return;
                }
                const started = await client.startIntegration(item.provider);
                if (started.url) window.location.href = started.url;
                else setNote(t("integrations.notConfigured"));
              }}>{item.provider === "google_drive" ? t("integrations.export") : t("integrations.connect")}</Button>
            </article>
          );
        })}
      </div>
      {note ? <p className="mt-4 text-sm text-teal-700">{note}</p> : null}
    </main>
  );
}
