"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Crumbs } from "@/components/crumbs";
import { Button, Input } from "@/components/ui";
import { userFacingError } from "@/lib/errors";
import { useApp } from "@/lib/providers";

type Detail = {
  id: string;
  title: string;
  court: string;
  documents: { id: string; filename: string }[];
  memos: { id: string; title: string }[];
  hearings: { id: string; kind: string; occursAt: string; title: string }[];
};

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const { t, client, user } = useApp();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  const [health, setHealth] = useState<{ score: number; hearings: number } | null>(null);

  async function load() {
    const result = await client.caseFile(id);
    setFailed(false);
    setDetail(result.caseFile as Detail);
    const score = await client.caseHealth(id).catch(() => null);
    setHealth(score);
  }
  useEffect(() => { load().catch(() => { setDetail(null); setFailed(true); }); }, [id]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      await client.addHearing(id, {
        kind: String(form.get("kind")) as "hearing",
        occursAt: new Date(String(form.get("occursAt"))).toISOString(),
        title: String(form.get("title") || ""),
      });
      await load();
    } catch (err) {
      setError(userFacingError(err, t));
    }
  }

  if (failed) {
    return (
      <div className="p-8">
        <p className="text-ink-700">{t("common.error")}</p>
        <button type="button" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white" onClick={() => void load().catch(() => setFailed(true))}>{t("common.retry")}</button>
      </div>
    );
  }
  if (!detail) return <p className="p-8 text-ink-500">{t("common.loading")}</p>;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Crumbs items={[{ href: "/app", label: t("nav.home") }, { href: "/app/cases", label: t("cases.title") }, { label: detail.title }]} />
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{detail.title}</h1>
      <p className="text-ink-500">{t(`courts.${detail.court}`)}</p>
      {health ? (
        <p className="mt-2 text-sm text-ink-700">
          {t("cases.health", { score: health.score })}
          <span className="mt-1 block text-xs text-ink-500">{t("cases.healthNote")}</span>
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-ink-200 p-4 dark:border-white/10">
          <h2 className="font-semibold">{t("cases.docs")}</h2>
          {detail.documents.map((doc) => <p key={doc.id} className="mt-2 text-sm">{doc.filename}</p>)}
          <h2 className="mt-4 font-semibold">{t("cases.memos")}</h2>
          {detail.memos.map((memo) => <Link key={memo.id} href={`/app/memos/${memo.id}`} className="mt-2 block text-sm font-semibold text-teal-700">{memo.title}</Link>)}
        </section>
        <section className="rounded-3xl border border-ink-200 p-4 dark:border-white/10">
          <h2 className="font-semibold">{t("cases.hearings")}</h2>
          {detail.hearings.map((hearing) => (
            <p key={hearing.id} className="mt-2 text-sm">
              {hearing.title} · {new Date(hearing.occursAt).toLocaleString()}
              {" · "}
              {t("cases.countdown", { days: Math.max(0, Math.ceil((new Date(hearing.occursAt).getTime() - Date.now()) / 86400000)) })}
            </p>
          ))}
          {user?.features.caseManagement ? (
            <form className="mt-4 grid gap-2" onSubmit={add}>
              <Input name="title" placeholder={t("cases.hearing")} required />
              <Input name="occursAt" type="datetime-local" required />
              <select name="kind" className="h-12 rounded-xl border border-ink-200 px-3 dark:border-white/10 dark:bg-navy-900">
                <option value="hearing">{t("cases.hearing")}</option>
                <option value="objection_deadline">{t("cases.deadline")}</option>
              </select>
              <Button type="submit">{t("cases.addHearing")}</Button>
            </form>
          ) : <p className="mt-3 text-sm text-ink-500">{t("cases.proOnly")}</p>}
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          <a className="mt-3 inline-block text-sm font-semibold text-teal-700" href={`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api"}/cases/${id}/hearings.ics`}>{t("common.download")}</a>
        </section>
      </div>
    </main>
  );
}
