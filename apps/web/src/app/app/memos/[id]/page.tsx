"use client";

import type { MemoView } from "@elawyer/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { useApp } from "@/lib/providers";

export default function MemoEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { t, client } = useApp();
  const [memo, setMemo] = useState<MemoView | null>(null);
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");

  useEffect(() => {
    client.memo(id).then((result) => {
      setMemo(result.memo);
      setBody(result.memo.body);
    }).catch(() => setMemo(null));
  }, [client, id]);

  async function save() {
    const result = await client.updateMemo(id, { body });
    setMemo(result.memo);
    setMessage(t("memo.savedOk"));
  }

  async function download(kind: "pdf" | "docx") {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api"}/memos/${id}/export.${kind}`, {
      credentials: "include",
    });
    if (!response.ok) {
      setMessage(t("errors.word"));
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
  if (!memo) return <p className="p-8 text-ink-500">{t("common.loading")}</p>;

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-ink-200 p-4 lg:border-e dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t("memo.citations")}</h2>
          <span className="rounded-full bg-success-soft px-2 py-1 text-xs text-success">{citations.length}</span>
        </div>
        <div className="mb-3 flex gap-2 text-xs font-semibold">
          {[["all", "memo.filterAll"], ["statute", "memo.filterStatute"], ["sharia", "memo.filterSharia"]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-full px-3 py-1 ${filter === key ? "bg-navy-700 text-white" : "bg-ink-100"}`}>{t(label)}</button>
          ))}
        </div>
        <div className="grid gap-2">
          {citations.map((item) => (
            <a key={item.id} href={item.sourceUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-ink-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-navy-800">
              <span className="font-semibold">{item.kind === "article" ? item.number : item.title}</span>
              <p className="mt-1 line-clamp-3 text-ink-500">{item.excerpt}</p>
              {item.isSample ? <span className="mt-2 inline-block rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning">{t("common.sample")}</span> : null}
            </a>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-ink-500">{t("memo.sampleNote")}</p>
      </aside>
      <section className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link href="/app/memos" className="text-sm text-ink-500">{t("common.back")}</Link>
          <h1 className="text-xl font-bold">{memo.title}</h1>
          <span className="rounded-full bg-warning-soft px-2 py-1 text-xs font-semibold text-warning">{t("memo.draft")}</span>
          <div className="ms-auto flex gap-2">
            <Button data-testid="save-memo" variant="secondary" onClick={() => void save()}>{t("memo.saveDraft")}</Button>
            <Button data-testid="export-word" variant="secondary" onClick={() => void download("docx")}>{t("memo.exportWord")}</Button>
            <Button data-testid="export-pdf" onClick={() => void download("pdf")}>{t("memo.exportPdf")}</Button>
          </div>
        </div>
        {message ? <p className="mb-2 text-sm text-teal-700">{message}</p> : null}
        <textarea data-testid="memo-body" value={body} onChange={(event) => setBody(event.target.value)} className="paper min-h-[70vh] w-full rounded-3xl border border-ink-200 p-8 text-base leading-8 shadow-card outline-none dark:border-white/10" />
        <p className="mt-2 text-xs text-ink-500">{t("editor.checkSource")}</p>
      </section>
    </div>
  );
}
