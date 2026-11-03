"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { useApp } from "@/lib/providers";

export default function TrackedSettingsPage() {
  const { t, client } = useApp();
  const [prefs, setPrefs] = useState({ inApp: true, email: true, sms: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    client.trackedSettings().then((row) => setPrefs({ inApp: row.inApp, email: row.email, sms: row.sms })).catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    await client.saveTrackedSettings(prefs);
    setSaved(true);
  }

  return (
    <main className="mx-auto grid max-w-xl gap-4 px-4 py-8">
      <Link href="/app/tracked" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-700">{t("track.back")}</Link>
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("track.settings")}</h1>
      <form onSubmit={submit} className="paper grid gap-3 rounded-3xl border border-ink-200 p-5 dark:border-white/10">
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={prefs.inApp} onChange={(event) => setPrefs({ ...prefs, inApp: event.target.checked })} />
          {t("track.inApp")}
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={prefs.email} onChange={(event) => setPrefs({ ...prefs, email: event.target.checked })} />
          {t("track.email")}
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={prefs.sms} onChange={(event) => setPrefs({ ...prefs, sms: event.target.checked })} />
          {t("track.sms")}
        </label>
        <Button type="submit">{t("common.save")}</Button>
        {saved ? <p className="text-sm text-success">{t("settings.saved")}</p> : null}
      </form>
    </main>
  );
}
