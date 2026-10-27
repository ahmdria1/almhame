"use client";

import { ApiError } from "@elawyer/api-client";
import { uploadErrorKey } from "@elawyer/i18n";
import { COURTS, MEMO_TYPES, type CourtType, type MemoType } from "@elawyer/types";
import { Paperclip, Scale, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "@/components/ui";
import { useApp } from "@/lib/providers";

type ChatRow = { id: string; title: string; court: CourtType; memoType: MemoType; caseId: string | null; updatedAt: string };
type Doc = { id: string; filename: string; byteSize: number };
type Msg = { id: string; role: string; content: string };

export default function WorkspacePage() {
  const { t, client, user, refreshUser } = useApp();
  const router = useRouter();
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [active, setActive] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [caseId, setCaseId] = useState<string>("");
  const [parties, setParties] = useState({ plaintiff: "", defendant: "" });
  const [court, setCourt] = useState<CourtType>("labor");
  const [memoType, setMemoType] = useState<MemoType>("lawsuit");
  const [text, setText] = useState("");
  const [quota, setQuota] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  async function loadList(selectId?: string) {
    const result = await client.chats();
    setChats(result.chats);
    const id = selectId || active || result.chats[0]?.id || "";
    if (id) await openChat(id);
  }

  async function openChat(id: string) {
    const detail = await client.chat(id);
    setActive(id);
    setMessages(detail.messages);
    setCourt(detail.chat.court);
    setMemoType(detail.chat.memoType);
    setCaseId(detail.caseFile?.id || "");
    setDocs(detail.caseFile?.documents || []);
    setParties({ plaintiff: detail.caseFile?.plaintiff || "", defendant: detail.caseFile?.defendant || "" });
  }

  useEffect(() => {
    loadList().catch(() => undefined);
  }, []);

  async function createChat() {
    setError("");
    try {
      const result = await client.createChat({ court, memoType });
      await refreshUser();
      await loadList(result.chat.id);
    } catch (err) {
      if (err instanceof ApiError && err.code === "QUOTA_CHATS") setQuota(true);
      else setError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  async function send() {
    if (!active || !text.trim()) return;
    const value = text;
    setText("");
    const result = await client.sendMessage(active, value);
    setMessages((current) => [...current, result.user, result.counsel]);
    const detail = await client.chat(active);
    setParties({ plaintiff: detail.caseFile?.plaintiff || "", defendant: detail.caseFile?.defendant || "" });
  }

  async function attach(file: File) {
    if (!caseId) return;
    setUploading(true);
    setError("");
    try {
      await client.uploadDocument(caseId, file, file.name);
      if (active) await openChat(active);
    } catch (err) {
      const key = err instanceof ApiError ? uploadErrorKey(err.code) : null;
      setError(key ? t(key) : err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function draft() {
    if (!active) return;
    setError("");
    try {
      const result = await client.draft(active, false);
      router.push(`/app/memos/${result.memo.id}`);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "QUOTA_MEMOS" || err.code === "QUOTA_CHATS")) setQuota(true);
      else setError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  const freeLimit = user?.planCode === "free" ? user.chatLimit ?? 5 : null;
  const left = freeLimit == null ? 0 : Math.max(0, freeLimit - (user?.chatCount ?? 0));
  const visible = chats.filter((chat) => !query || chat.title.includes(query));
  const completeness = Math.min(100, (docs.length ? 40 : 0) + (messages.length > 1 ? 30 : 0) + (parties.plaintiff ? 30 : 0));

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[300px_minmax(0,1fr)_280px]">
      <aside className="border-ink-200 p-4 lg:border-e dark:border-white/10">
        <p className="text-sm font-semibold text-ink-500">{t("workspace.summary")}</p>
        <dl className="mt-3 grid gap-2 text-sm">
          <div><dt className="text-ink-400">{t("workspace.court")}</dt><dd className="font-semibold">{t(`courts.${court}`)}</dd></div>
          <div><dt className="text-ink-400">{t("workspace.plaintiff")}</dt><dd>{parties.plaintiff || "—"}</dd></div>
          <div><dt className="text-ink-400">{t("workspace.defendant")}</dt><dd>{parties.defendant || "—"}</dd></div>
        </dl>
        <p className="mt-6 text-sm font-semibold">{t("workspace.documents")} ({docs.length})</p>
        <div className="mt-2 grid gap-2">
          {docs.map((doc) => (
            <div key={doc.id} className="rounded-2xl border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800">
              <p className="font-semibold">{doc.filename}</p>
              <p className="text-xs text-ink-400">{Math.ceil(doc.byteSize / 1024)} KB</p>
            </div>
          ))}
          <label className="cursor-pointer rounded-xl border border-dashed border-ink-300 px-3 py-2 text-center text-sm text-ink-500">
            {uploading ? t("workspace.uploading") : t("workspace.attachments")}
            <input ref={fileRef} data-testid="file-input" className="hidden" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void attach(file);
            }} />
          </label>
        </div>
        <p className="mt-4 text-xs text-ink-500">{t("workspace.completeness")} {completeness}%</p>
        <div className="mt-1 h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-teal-600" style={{ width: `${completeness}%` }} /></div>
        <Button data-testid="draft-button" className="mt-4 w-full" onClick={draft} disabled={!active}>{t("workspace.draft")}</Button>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </aside>
      <section className="flex min-h-[70vh] flex-col">
        <div className="flex-1 space-y-3 overflow-auto p-4">
          {messages.length === 0 ? (
            <div className="paper mx-auto mt-10 max-w-lg rounded-3xl border border-ink-200 p-6 text-center dark:border-white/10">
              <h2 className="text-xl font-semibold">{t("workspace.emptyTitle")}</h2>
              <p className="mt-2 text-sm leading-7 text-ink-500">{t("workspace.emptyBody")}</p>
            </div>
          ) : messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "ms-auto max-w-[80%] rounded-2xl bg-navy-700 px-4 py-3 text-sm leading-7 text-white" : "me-auto flex max-w-[80%] gap-2"}>
              {message.role === "counsel" ? <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700"><Scale size={16} /></span> : null}
              <p className={message.role === "counsel" ? "rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm leading-7 dark:border-white/10 dark:bg-navy-800" : ""}>{message.content}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-ink-200 p-3 dark:border-white/10">
          <div className="mb-2 flex gap-2">
            <select data-testid="memo-type-select" className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800" value={memoType} onChange={(event) => {
              const next = event.target.value as MemoType;
              setMemoType(next);
              if (active) void client.updateChat(active, { memoType: next }).then(() => loadList(active)).catch((err) => setError(err instanceof ApiError ? err.message : t("common.error")));
            }}>
              {MEMO_TYPES.map((item) => <option key={item} value={item}>{t(`memos.${item}`)}</option>)}
            </select>
            <select data-testid="court-select" className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800" value={court} onChange={(event) => {
              const next = event.target.value as CourtType;
              setCourt(next);
              if (active) void client.updateChat(active, { court: next }).then(() => loadList(active)).catch((err) => setError(err instanceof ApiError ? err.message : t("common.error")));
            }}>
              {COURTS.map((item) => <option key={item} value={item}>{t(`courts.${item}`)}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input data-testid="chat-input" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void send(); }} placeholder={t("workspace.placeholder")} className="h-12 flex-1 rounded-2xl border border-ink-200 bg-white px-4 outline-none dark:border-white/10 dark:bg-navy-800" />
            <button aria-label={t("workspace.attach")} className="text-ink-400 disabled:opacity-40" type="button" disabled={uploading || !caseId} onClick={() => fileRef.current?.click()}><Paperclip size={18} /></button>
            <button data-testid="chat-send" className="grid h-12 w-12 place-items-center rounded-full bg-navy-700 text-white" type="button" onClick={() => void send()}><Send size={18} /></button>
          </div>
          {uploading ? <p className="mt-2 text-xs text-ink-500">{t("workspace.uploading")}</p> : null}
        </div>
      </section>
      <aside className="border-ink-200 p-4 lg:border-s dark:border-white/10">
        <Button data-testid="new-chat" className="w-full" onClick={() => void createChat()}>{t("workspace.newChat")}</Button>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("workspace.search")} className="mt-3 h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-navy-800" />
        <div className="mt-3 grid gap-2">
          {visible.map((chat) => (
            <button key={chat.id} type="button" onClick={() => void openChat(chat.id)} className={`rounded-2xl px-3 py-3 text-start text-sm ${chat.id === active ? "bg-brand-100 text-navy-700" : "hover:bg-ink-100 dark:hover:bg-white/5"}`}>
              <span className="block font-semibold">{chat.title}</span>
              <span className="text-xs text-ink-500">{t(`courts.${chat.court}`)}</span>
            </button>
          ))}
        </div>
        {user?.planCode === "free" ? (
          <div className="mt-4 rounded-2xl bg-teal-100 p-3 text-sm text-teal-700">
            <p>{t("workspace.remaining", { left, total: freeLimit ?? 5 })}</p>
            <Link href="/app/plans" className="mt-2 inline-block font-semibold">{t("workspace.upgrade")}</Link>
          </div>
        ) : null}
      </aside>
      <Modal open={quota} testId="quota-modal" title={t("quota.title")} body={t("quota.body")} onClose={() => setQuota(false)} action={<Link href="/app/plans" className="rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white">{t("quota.cta")}</Link>} />
    </div>
  );
}
