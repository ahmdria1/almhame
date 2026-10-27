"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";

export default function MemosPage() {
  const { t, client } = useApp();
  const [rows, setRows] = useState<{ id: string; title: string; court: string; memoType: string; updatedAt: string }[]>([]);
  useEffect(() => {
    client.memos().then((result) => setRows(result.memos)).catch(() => setRows([]));
  }, [client]);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("nav.memos")}</h1>
      {rows.length === 0 ? <p className="mt-6 text-ink-500">{t("memo.empty")}</p> : (
        <div className="mt-6 grid gap-3">
          {rows.map((row) => (
            <Link key={row.id} href={`/app/memos/${row.id}`} className="paper flex items-center justify-between rounded-2xl border border-ink-200 px-4 py-4 dark:border-white/10">
              <div>
                <p className="font-semibold">{row.title}</p>
                <p className="text-sm text-ink-500">{t(`courts.${row.court}`)} · {t(`memos.${row.memoType}`)}</p>
              </div>
              <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">{t("memo.draft")}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
