"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/skeleton";
import { useApp } from "@/lib/providers";

export default function MemosPage() {
  const { t, client } = useApp();
  const [rows, setRows] = useState<{ id: string; title: string; court: string; memoType: string; updatedAt: string }[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const more = useRef<HTMLDivElement>(null);
  useEffect(() => {
    client.memos(page).then((result) => {
      setPages(result.totalPages);
      setRows((current) => page === 1 ? result.memos : [...(current || []), ...result.memos]);
    }).catch(() => setRows([]));
  }, [client, page]);
  useEffect(() => {
    const node = more.current;
    if (!node || page >= pages) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setPage((value) => value + 1);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [page, pages]);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("nav.memos")}</h1>
      {rows === null ? <Skeleton className="mt-6 h-24" /> : rows.length === 0 ? <p className="mt-6 text-ink-500">{t("memo.empty")}</p> : (
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
      <div ref={more} className="h-8" />
    </main>
  );
}
