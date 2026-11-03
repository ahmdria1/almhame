"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountFrame } from "@/components/account-frame";
import { useApp } from "@/lib/providers";

export default function SavedPage() {
  const { t, client } = useApp();
  const [items, setItems] = useState<{ id: string; kind: string; title: string; refId: string }[]>([]);
  useEffect(() => { client.saved().then((result) => setItems(result.items)).catch(() => setItems([])); }, [client]);
  return (
    <AccountFrame title={t("saved.title")}>
      {items.length === 0 ? <p className="text-ink-500">{t("saved.empty")}</p> : items.map((item) => (
        <div key={item.id} className="mt-3 flex min-h-14 items-center justify-between rounded-2xl border border-ink-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-navy-800">
          {item.kind === "memo" ? <Link href={`/app/memos/${item.refId}`} className="font-semibold">{item.title}</Link> : <span className="font-semibold">{item.title}</span>}
          <button type="button" className="inline-flex min-h-11 items-center text-sm font-semibold text-danger" onClick={async () => { await client.unsave(item.id); setItems((rows) => rows.filter((row) => row.id !== item.id)); }}>{t("common.cancel")}</button>
        </div>
      ))}
    </AccountFrame>
  );
}
