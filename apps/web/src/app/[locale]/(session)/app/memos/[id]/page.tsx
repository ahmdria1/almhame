"use client";

import type { MemoView } from "@elawyer/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Crumbs } from "@/components/crumbs";
import { DiffView } from "@/components/diff-view";
import { PdfPreview } from "@/components/pdf-preview";
import { Button } from "@/components/ui";
import { userFacingError } from "@/lib/errors";
import { rememberMemo, wordCount } from "@/lib/memo-list";
import { useApp } from "@/lib/providers";

export default function MemoEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { t, client, user, locale } = useApp();
  const [memo, setMemo] = useState<MemoView | null>(null);
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [savedBody, setSavedBody] = useState("");
  const [showDiff, setShowDiff] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pane, setPane] = useState<"memo" | "sources">("memo");

  function load() {
    setFailed(false);
    client.memo(id).then((result) => {
      const local = window.localStorage.getItem(`memo:${id}`);
      setMemo(result.memo);
      setSavedBody(result.memo.body);
      setSavedAt(result.memo.updatedAt);
      setBody(local || result.memo.body);
      rememberMemo(window.localStorage, { id: result.memo.id, title: result.memo.title }, new Date().toISOString());
    }).catch(() => {
      setMemo(null);
      setFailed(true);
    });
  }

  useEffect(() => {
    load();
  }, [client, id]);

  useEffect(() => {
    if (!body || body === savedBody) return;
    window.localStorage.setItem(`memo:${id}`, body);
    const timer = window.setTimeout(() => {
      void client.updateMemo(id, { body }).then((result) => {
        setMemo(result.memo);
        setSavedBody(body);
        setSavedAt(result.memo.updatedAt);
        window.localStorage.removeItem(`memo:${id}`);
        setMessage(t("memo.savedOk"));
      }).catch((err) => setMessage(userFacingError(err, t)));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [body, id, savedBody, client, t]);

  async function save() {
    try {
      const result = await client.updateMemo(id, { body });
      setMemo(result.memo);
      setSavedBody(body);
      setSavedAt(result.memo.updatedAt);
      window.localStorage.removeItem(`memo:${id}`);
      setMessage(t("memo.savedOk"));
    } catch (err) {
      setMessage(userFacingError(err, t));
    }
  }

  async function download(kind: "pdf" | "docx") {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api"}/memos/${id}/export.${kind}?locale=ar`, {
      credentials: "include",
    });
    if (!response.ok) {
      setMessage(kind === "docx" && response.status === 403 ? t("errors.word") : t("common.error"));
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = kind === "pdf" ? "memo.pdf" : "memo.docx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const citations = (memo?.citations || []).filter((item) => filter === "all" || (filter === "statute" ? item.kind === "article" : item.kind === "sharia"));
  if (failed) {
    return (
      <div className="p-8">
        <p className="text-ink-700">{t("common.error")}</p>
        <button type="button" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white" onClick={() => load()}>{t("common.retry")}</button>
      </div>
    );
  }
  if (!memo) return <p className="p-8 text-ink-500">{t("common.loading")}</p>;

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex border-b border-ink-200 lg:hidden dark:border-white/10">
        <button type="button" className={`min-h-11 flex-1 text-sm font-semibold ${pane === "memo" ? "border-b-2 border-navy-700 text-navy-700" : "text-ink-500"}`} onClick={() => setPane("memo")}>{t("workspace.tabMemo")}</button>
        <button type="button" className={`min-h-11 flex-1 text-sm font-semibold ${pane === "sources" ? "border-b-2 border-navy-700 text-navy-700" : "text-ink-500"}`} onClick={() => setPane("sources")}>{t("workspace.tabSources")}</button>
      </div>
      <aside className={`${pane === "sources" ? "block" : "hidden"} border-ink-200 p-4 lg:block lg:border-e dark:border-white/10`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t("memo.citations")}</h2>
          <span className="rounded-full bg-success-soft px-2 py-1 text-xs text-success">{citations.length}</span>
        </div>
        <div className="mb-3 flex gap-2 text-xs font-semibold">
          {[["all", "memo.filterAll"], ["statute", "memo.filterStatute"], ["sharia", "memo.filterSharia"]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`inline-flex min-h-11 items-center rounded-full px-3 ${filter === key ? "bg-navy-700 text-white" : "bg-ink-100"}`}>{t(label)}</button>
          ))}
        </div>
        <div className="grid gap-2">
          {citations.map((item) => (
            <a key={item.id} href={item.sourceUrl} title={t("memo.sourceTip")} target="_blank" rel="noreferrer" className="rounded-2xl border border-ink-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-navy-800">
              <span className="font-semibold">{item.kind === "article" ? item.number : item.title}</span>
              <p className="mt-1 line-clamp-3 text-ink-500">{item.excerpt}</p>
              {item.isSample ? <span className="mt-2 inline-block rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning">{t("common.sample")}</span> : null}
            </a>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-ink-500">{t("memo.sampleNote")}</p>
      </aside>
      <section className={`${pane === "memo" ? "block" : "hidden"} p-4 lg:block`}>
        <Crumbs items={[{ href: "/app", label: t("nav.home") }, { href: "/app/memos", label: t("nav.memos") }, { label: memo.title }]} />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link href="/app/memos" className="text-sm text-ink-500">{t("common.back")}</Link>
          <h1 className="text-xl font-bold">{memo.title}</h1>
          <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700">{t("memo.draft")}</span>
          <div className="ms-auto flex gap-2">
            <Button data-testid="save-memo" variant="secondary" onClick={() => void save()}>{t("memo.saveDraft")}</Button>
            <Button data-testid="export-word" variant="secondary" disabled={!user?.features.word} title={user?.features.word ? undefined : t("errors.word")} onClick={() => void download("docx")}>{t("memo.exportWord")}</Button>
            <Button data-testid="export-pdf" onClick={() => void download("pdf")}>{t("memo.exportPdf")}</Button>
            <Button variant="secondary" type="button" onClick={() => setShowPdf((value) => !value)}>{t("memo.preview")}</Button>
            <Button variant="secondary" type="button" onClick={() => setShowDiff((value) => !value)}>{t("memo.diff")}</Button>
          </div>
        </div>
        <p className="mb-2 text-sm text-teal-700">
          {message ? <span>{message}</span> : null}
          {savedAt ? <time dateTime={savedAt} className="ms-2 text-ink-500">{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(savedAt))}</time> : null}
          <span className="ms-2 text-ink-500">{wordCount(body)}</span>
        </p>
        <textarea data-testid="memo-body" value={body} onChange={(event) => setBody(event.target.value)} className="paper min-h-[70vh] w-full rounded-3xl border border-ink-200 p-8 text-base leading-8 shadow-card outline-none dark:border-white/10" />
        {showDiff ? <DiffView before={savedBody} after={body} /> : null}
        {showPdf ? <PdfPreview memoId={id} /> : null}
        <p className="mt-2 text-xs text-ink-500">{t("editor.checkSource")}</p>
      </section>
    </div>
  );
}
