"use client";

import { COURTS, type CourtType } from "@elawyer/types";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import { useApp } from "@/lib/providers";

type Row = { id: string; caseNumber: string; court: string; role: string; status: string; filings: number };

export default function TrackedCasesPage() {
  const { t, client } = useApp();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [cases, setCases] = useState<Row[]>([]);
  const [caseNumber, setCaseNumber] = useState("");
  const [court, setCourt] = useState<CourtType>("labor");
  const [role, setRole] = useState("plaintiff");
  const [error, setError] = useState("");

  async function load() {
    const result = await client.tracked();
    setConnected(result.connected);
    setCases(result.cases);
  }

  useEffect(() => {
    load().catch(() => setError(t("errors.busy")));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await client.addTracked({ caseNumber, court, role });
      setCaseNumber("");
      await load();
    } catch {
      setError(t("errors.busy"));
    }
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("track.title")}</h1>
        <Link href="/app/tracked/settings" data-testid="tracked-settings" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-teal-700">{t("track.settings")}</Link>
      </div>
      {connected === false ? <p data-testid="tracked-notice" className="rounded-2xl bg-teal-100 px-4 py-3 text-sm leading-7 text-teal-700">{t("track.notConnected")}</p> : null}
      <form onSubmit={submit} className="paper grid gap-3 rounded-3xl border border-ink-200 p-5 dark:border-white/10">
        <h2 className="font-semibold">{t("track.add")}</h2>
        <label className="text-sm font-semibold">{t("track.number")}
          <Input data-testid="tracked-number" value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} className="mt-1" required minLength={3} maxLength={40} />
        </label>
        <label className="text-sm font-semibold">{t("track.court")}
          <select data-testid="tracked-court" className="mt-1 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 dark:border-white/10 dark:bg-navy-900" value={court} onChange={(event) => setCourt(event.target.value as CourtType)}>
            {COURTS.map((item) => <option key={item} value={item}>{t(`courts.${item}`)}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">{t("track.role")}
          <select data-testid="tracked-role" className="mt-1 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 dark:border-white/10 dark:bg-navy-900" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="plaintiff">{t("track.plaintiff")}</option>
            <option value="defendant">{t("track.defendant")}</option>
          </select>
        </label>
        <Button data-testid="tracked-submit" type="submit">{t("track.submit")}</Button>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>
      {cases.length === 0 ? <p className="text-sm text-ink-500">{t("track.empty")}</p> : (
        <ul className="grid gap-2">
          {cases.map((row) => (
            <li key={row.id}>
              <Link data-testid="tracked-row" href={`/app/tracked/${row.id}`} className="flex min-h-11 items-center justify-between rounded-2xl border border-ink-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-navy-800">
                <span className="font-semibold">{row.caseNumber}</span>
                <span className="text-sm text-ink-500">{t(`courts.${row.court}`)} · {row.status === "watching" ? t("track.statusWatching") : t("track.statusPending")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
