"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";

export default function SavedPage() {
  const { t, client } = useApp();
  const [items, setItems] = useState<{ id: string; kind: string; title: string; refId: string }[]>([]);
  useEffect(() => { client.saved().then((result) => setItems(result.items)).catch(() => setItems([])); }, [client]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("saved.title")}</h1>
      {items.length === 0 ? <p className="mt-4 text-ink-500">{t("saved.empty")}</p> : items.map((item) => (
        <div key={item.id} className="mt-3 flex items-center justify-between rounded-2xl border border-ink-200 px-4 py-3 dark:border-white/10">
          {item.kind === "memo" ? <Link href={`/app/memos/${item.refId}`} className="font-semibold">{item.title}</Link> : <span className="font-semibold">{item.title}</span>}
          <button type="button" className="text-sm text-danger" onClick={async () => { await client.unsave(item.id); setItems((rows) => rows.filter((row) => row.id !== item.id)); }}>{t("common.cancel")}</button>
        </div>
      ))}
    </main>
  );
}
