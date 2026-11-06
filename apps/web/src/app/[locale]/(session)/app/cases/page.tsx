"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/skeleton";
import { useApp } from "@/lib/providers";

export default function CasesPage() {
  const { t, client } = useApp();
  const [rows, setRows] = useState<{ id: string; title: string; court: string }[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setFailed(false);
    client.cases().then((result) => setRows(result.cases)).catch(() => {
      setRows(null);
      setFailed(true);
    });
  }, [client, attempt]);
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("cases.title")}</h1>
      {failed ? (
        <div className="mt-4">
          <p className="text-ink-700">{t("common.error")}</p>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white" onClick={() => setAttempt((value) => value + 1)}>{t("common.retry")}</button>
        </div>
      ) : rows === null ? <Skeleton className="mt-4 h-16" /> : rows.length === 0 ? <p className="mt-4 text-ink-500">{t("cases.empty")}</p> : rows.map((row) => (
        <Link key={row.id} href={`/app/cases/${row.id}`} className="mt-3 block rounded-2xl border border-ink-200 px-4 py-3 dark:border-white/10">
          <span className="font-semibold">{row.title}</span>
          <span className="ms-2 text-sm text-ink-500">{t(`courts.${row.court}`)}</span>
        </Link>
      ))}
    </main>
  );
}
