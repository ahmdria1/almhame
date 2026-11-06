"use client";

import { COURTS, MEMO_TYPES } from "@elawyer/types";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/skeleton";
import { filterMemos, readRecent, sortMemos, type MemoRow } from "@/lib/memo-list";
import { useApp } from "@/lib/providers";

export function MemoBrowser() {
  const { t, client } = useApp();
  const router = useRouter();
  const search = useSearchParams();
  const q = search.get("q") || "";
  const court = search.get("court") || "";
  const memoType = search.get("type") || "";
  const from = search.get("from") || "";
  const to = search.get("to") || "";
  const filtering = Boolean(q || court || memoType || from || to);
  const [rows, setRows] = useState<MemoRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [recent, setRecent] = useState<{ id: string; title: string }[]>([]);
  const more = useRef<HTMLDivElement>(null);

  function replaceQuery(next: Record<string, string>) {
    const params = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const text = params.toString();
    setPage(1);
    router.replace(text ? `/app/memos?${text}` : "/app/memos");
  }

  useEffect(() => {
    setRecent(readRecent(window.localStorage));
  }, [attempt]);

  useEffect(() => {
    let cancel = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setFailed(false);
      async function run() {
        if (cancel) return;
        if (!filtering) {
          const result = await client.memos(page);
          if (cancel) return;
          setPages(result.totalPages);
          setRows((current) => (page === 1 ? result.memos : [...(current || []), ...result.memos]));
          return;
        }
        const first = await client.memos(1);
        if (cancel) return;
        const all = [...first.memos];
        for (let index = 2; index <= first.totalPages; index += 1) {
          if (cancel) return;
          const next = await client.memos(index);
          all.push(...next.memos);
        }
        const searchIds = q.trim() ? (await client.search(q.trim(), controller.signal)).memos.map((memo) => memo.id) : null;
        if (cancel) return;
        setPages(1);
        setRows(sortMemos(filterMemos(all, { q, court, memoType, from, to, searchIds }), order));
      }
      run().catch((err: unknown) => {
        if (cancel || (err instanceof DOMException && err.name === "AbortError")) return;
        if (page === 1) setRows(null);
        setFailed(true);
      });
    }, q.trim() ? 300 : 0);
    return () => {
      cancel = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [client, page, attempt, filtering, q, court, memoType, from, to, order]);

  useEffect(() => {
    const node = more.current;
    if (!node || filtering || page >= pages) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setPage((value) => value + 1);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [page, pages, filtering, rows]);

  const visible = filtering || order === "newest" || !rows ? rows : sortMemos(rows, order);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("nav.memos")}</h1>
      <form
        className="mt-4 grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          replaceQuery({ q: String(data.get("q") || "") });
        }}
      >
        <input
          name="q"
          defaultValue={q}
          key={q}
          placeholder={t("workspace.search")}
          className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-navy-800"
        />
        <button type="submit" className="sr-only">
          {t("workspace.search")}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">
          {t("workspace.court")}
          <select
            value={court}
            onChange={(event) => replaceQuery({ court: event.target.value })}
            className="mt-1 block h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-navy-800"
          >
            <option value="">{t("memo.filterAll")}</option>
            {COURTS.map((item) => (
              <option key={item} value={item}>
                {t(`courts.${item}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          {t("workspace.tabMemo")}
          <select
            value={memoType}
            onChange={(event) => replaceQuery({ type: event.target.value })}
            className="mt-1 block h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-navy-800"
          >
            <option value="">{t("memo.filterAll")}</option>
            {MEMO_TYPES.map((item) => (
              <option key={item} value={item}>
                {t(`memos.${item}`)}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-wrap items-end gap-2">
          <legend className="text-sm font-semibold">{t("landing.f5Title")}</legend>
          <input
            type="date"
            value={from}
            aria-label={t("landing.f5Title")}
            onChange={(event) => replaceQuery({ from: event.target.value })}
            className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-navy-800"
          />
          <input
            type="date"
            value={to}
            aria-label={t("cases.addHearing")}
            onChange={(event) => replaceQuery({ to: event.target.value })}
            className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-navy-800"
          />
        </fieldset>
        <button
          type="button"
          aria-label={t("landing.f5Title")}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 px-3 text-sm font-semibold"
          onClick={() => setOrder((value) => (value === "newest" ? "oldest" : "newest"))}
        >
          <ArrowUpDown size={16} />
          {order === "newest" ? "↓" : "↑"}
        </button>
        {filtering ? (
          <button type="button" className="min-h-11 text-sm font-semibold text-teal-700" onClick={() => router.replace("/app/memos")}>
            {t("common.cancel")}
          </button>
        ) : null}
      </div>
      {recent.length > 0 ? (
        <nav aria-label={t("nav.memos")} className="mt-4 flex flex-wrap gap-2">
          {recent.map((item) => (
            <Link key={item.id} href={`/app/memos/${item.id}`} className="rounded-full bg-ink-100 px-3 py-2 text-sm font-semibold text-navy-700 dark:bg-white/10 dark:text-white">
              {item.title}
            </Link>
          ))}
        </nav>
      ) : null}
      {failed && rows === null ? (
        <div className="mt-6">
          <p className="text-ink-700">{t("common.error")}</p>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white" onClick={() => setAttempt((value) => value + 1)}>
            {t("common.retry")}
          </button>
        </div>
      ) : visible === null ? (
        <Skeleton className="mt-6 h-24" />
      ) : visible.length === 0 ? (
        filtering ? null : <p className="mt-6 text-ink-500">{t("memo.empty")}</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {visible.map((row) => (
            <Link key={row.id} href={`/app/memos/${row.id}`} className="paper flex items-center justify-between rounded-2xl border border-ink-200 px-4 py-4 dark:border-white/10">
              <div>
                <p className="font-semibold">{row.title}</p>
                <p className="text-sm text-ink-500">
                  {t(`courts.${row.court}`)} · {t(`memos.${row.memoType}`)}
                </p>
              </div>
              {row.status === "draft" || !row.status ? <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">{t("memo.draft")}</span> : null}
            </Link>
          ))}
        </div>
      )}
      <div ref={more} className="h-8" />
    </main>
  );
}
