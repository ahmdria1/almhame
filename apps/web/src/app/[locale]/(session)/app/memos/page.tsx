"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/skeleton";
import { useApp } from "@/lib/providers";

export default function MemosPage() {
  const { t, client } = useApp();
  const [rows, setRows] = useState<{ id: string; title: string; court: string; memoType: string; updatedAt: string }[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const more = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setFailed(false);
    client.memos(page).then((result) => {
      setPages(result.totalPages);
      setRows((current) => page === 1 ? result.memos : [...(current || []), ...result.memos]);
    }).catch(() => {
      if (page === 1) setRows(null);
      setFailed(true);
    });
  }, [client, page, attempt]);
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
      {failed && rows === null ? (
        <div className="mt-6">
          <p className="text-ink-700">{t("common.error")}</p>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white" onClick={() => setAttempt((value) => value + 1)}>{t("common.retry")}</button>
        </div>
      ) : rows === null ? <Skeleton className="mt-6 h-24" /> : rows.length === 0 ? <p className="mt-6 text-ink-500">{t("memo.empty")}</p> : (
        <div className="mt-6 grid gap-3">
          {rows.map((row) => (
            <Link key={row.id} href={`/app/memos/${row.id}`} className="paper flex items-center justify-between rounded-2xl border border-ink-200 px-4 py-4 dark:border-white/10">
              <div>
                <p className="font-semibold">{row.title}</p>
                <p className="text-sm text-ink-500">{t(`courts.${row.court}`)} · {t(`memos.${row.memoType}`)}</p>
              </div>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">{t("memo.draft")}</span>
            </Link>
          ))}
        </div>
      )}
      <div ref={more} className="h-8" />
    </main>
  );
}
