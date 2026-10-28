"use client";

import { LOCALES } from "@elawyer/types";
import { LANGUAGE_NAMES } from "@elawyer/i18n";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button, Input } from "@/components/ui";
import { useApp } from "@/lib/providers";
import { pagePath } from "@/seo/catalog";

export default function SettingsPage() {
  const { t, user, client, setTheme, theme, setLocale, locale, logout } = useApp();
  const [name, setName] = useState(user?.name || "");
  const [message, setMessage] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    await client.updateMe({ name, notifyHearings: user?.notifyHearings });
    setMessage(t("settings.saved"));
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("settings.title")}</h1>
      <form onSubmit={save} className="paper rounded-3xl border border-ink-200 p-5 dark:border-white/10">
        <h2 className="font-semibold">{t("settings.profile")}</h2>
        <label className="mt-3 block text-sm font-semibold">{t("auth.name")}<Input value={name} onChange={(event) => setName(event.target.value)} className="mt-1" /></label>
        <p className="mt-2 text-sm text-ink-500">{user?.phone} · {user?.email}</p>
        <Button className="mt-4" type="submit">{t("common.save")}</Button>
        {message ? <p className="mt-2 text-sm text-success">{message}</p> : null}
      </form>
      <section className="paper rounded-3xl border border-ink-200 p-5 dark:border-white/10">
        <h2 className="font-semibold">{t("settings.appearance")}</h2>
        <div className="mt-3 flex gap-2">
          <Button variant={theme === "light" ? "primary" : "secondary"} type="button" onClick={() => setTheme("light")}>{t("settings.light")}</Button>
          <Button variant={theme === "dark" ? "primary" : "secondary"} type="button" onClick={() => setTheme("dark")}>{t("settings.dark")}</Button>
        </div>
        <label className="mt-4 block text-sm font-semibold">{t("settings.language")}
          <select className="mt-1 h-12 w-full rounded-xl border border-ink-200 bg-white px-3 dark:border-white/10 dark:bg-navy-900" value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}>
            {LOCALES.map((code) => <option key={code} value={code}>{LANGUAGE_NAMES[code]}</option>)}
          </select>
        </label>
      </section>
      <section className="paper rounded-3xl border border-ink-200 p-5 dark:border-white/10">
        <h2 className="font-semibold">{t("settings.notifications")}</h2>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked={user?.notifyHearings} onChange={(event) => void client.updateMe({ notifyHearings: event.target.checked })} />
          {t("settings.hearingsToggle")}
        </label>
      </section>
      <section className="paper rounded-3xl border border-danger/30 p-5">
        <h2 className="font-semibold">{t("settings.privacy")}</h2>
        <p className="mt-2 text-sm leading-7 text-ink-500">{t("settings.deleteWarn")}</p>
        <p className="mt-2 text-sm">
          <Link className="font-semibold text-teal-700" href={pagePath(locale, { kind: "top", id: "privacy" })}>{t("footer.privacy")}</Link>
          {" · "}
          <Link className="font-semibold text-teal-700" href={pagePath(locale, { kind: "top", id: "terms" })}>{t("footer.terms")}</Link>
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" type="button" onClick={async () => {
            const data = await client.exportMe();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "my-data.json";
            anchor.click();
          }}>{t("settings.export")}</Button>
          <Button variant="danger" type="button" onClick={async () => {
            if (!window.confirm(t("settings.deleteWarn"))) return;
            await client.deleteMe();
            await logout();
            window.location.href = "/";
          }}>{t("settings.delete")}</Button>
        </div>
      </section>
    </main>
  );
}
