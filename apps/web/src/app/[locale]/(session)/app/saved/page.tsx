"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";

export default function SavedPage() {
  const { t, client } = useApp();
  const [items, setItems] = useState<{ id: string; kind: string; title: string; refId: string }[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setFailed(false);
    client.saved().then((result) => setItems(result.items)).catch(() => {
      setItems(null);
      setFailed(true);
    });
  }, [client, attempt]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("saved.title")}</h1>
      {failed ? (
        <div className="mt-4">
          <p className="text-ink-700">{t("common.error")}</p>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white" onClick={() => setAttempt((value) => value + 1)}>{t("common.retry")}</button>
        </div>
      ) : items === null ? <p className="mt-4 text-ink-500">{t("common.loading")}</p> : items.length === 0 ? <p className="mt-4 text-ink-500">{t("saved.empty")}</p> : items.map((item) => (
        <div key={item.id} className="mt-3 flex items-center justify-between rounded-2xl border border-ink-200 px-4 py-3 dark:border-white/10">
          {item.kind === "memo" ? <Link href={`/app/memos/${item.refId}`} className="font-semibold">{item.title}</Link> : <span className="font-semibold">{item.title}</span>}
          <button type="button" className="min-h-11 text-sm text-danger" onClick={async () => { await client.unsave(item.id); setItems((rows) => (rows || []).filter((row) => row.id !== item.id)); }}>{t("common.cancel")}</button>
        </div>
      ))}
    </main>
  );
}
