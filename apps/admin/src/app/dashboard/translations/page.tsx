"use client";

import { FormEvent, useState } from "react";
import { adminFetch } from "../../../lib/api";

type Status = { locale: string; status: string; error: string; text: string };

export default function TranslationsPage() {
  const [sourceId, setSourceId] = useState("");
  const [rows, setRows] = useState<Status[]>([]);
  const [error, setError] = useState("");
  const [overrideLocale, setOverrideLocale] = useState("en");
  const [overrideText, setOverrideText] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await adminFetch<{ sourceId: string; locales: Status[] }>("/admin/copy", {
        method: "POST",
        body: JSON.stringify({
          scope: "notice",
          text: String(form.get("text") || ""),
          priority: String(form.get("priority") || "normal"),
        }),
      });
      setSourceId(result.sourceId);
      setRows(result.locales);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الحفظ");
    }
  }

  async function publish() {
    setError("");
    try {
      await adminFetch(`/admin/copy/notice/${sourceId}/publish`, { method: "POST" });
      const next = await adminFetch<{ locales: Status[] }>(`/admin/copy/notice/${sourceId}`);
      setRows(next.locales);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر النشر");
    }
  }

  async function override(event: FormEvent) {
    event.preventDefault();
    if (!sourceId) return;
    try {
      const result = await adminFetch<{ locales: Status[] }>(`/admin/copy/notice/${sourceId}/${overrideLocale}`, {
        method: "PATCH",
        body: JSON.stringify({ text: overrideText }),
      });
      setRows(result.locales);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر التعديل");
    }
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold text-navy-700">ترجمة المحتوى</h1>
      <p className="text-sm text-ink-500">يُكتب النص بالعربية، وتُترجم بقية اللغات تلقائياً قبل النشر.</p>
      <form onSubmit={save} className="grid gap-3 rounded-3xl border border-ink-200 bg-white p-4">
        <textarea name="text" required className="min-h-28 rounded-xl border px-3 py-2" placeholder="النص العربي" />
        <select name="priority" className="h-12 rounded-xl border px-3">
          <option value="normal">عادي</option>
          <option value="urgent">عاجل</option>
        </select>
        <button className="h-12 rounded-xl bg-navy-700 font-semibold text-white" type="submit">حفظ وترجمة</button>
      </form>
      {rows.length ? (
        <div className="rounded-3xl border border-ink-200 bg-white p-4">
          <ul className="grid gap-2 text-sm">
            {rows.map((row) => (
              <li key={row.locale} className="flex items-center justify-between gap-3">
                <span>{row.locale}</span>
                <span className={row.status === "failed" ? "text-red-700" : "text-teal-700"}>{row.status}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={override} className="mt-4 grid gap-2">
            <select value={overrideLocale} onChange={(event) => setOverrideLocale(event.target.value)} className="h-12 rounded-xl border px-3">
              {rows.filter((row) => row.locale !== "ar").map((row) => <option key={row.locale} value={row.locale}>{row.locale}</option>)}
            </select>
            <textarea value={overrideText} onChange={(event) => setOverrideText(event.target.value)} className="min-h-20 rounded-xl border px-3 py-2" placeholder="تعديل يدوي لهذه اللغة" />
            <button className="h-12 rounded-xl border font-semibold" type="submit">حفظ التعديل</button>
          </form>
          <button className="mt-3 h-12 w-full rounded-xl bg-navy-700 font-semibold text-white" type="button" onClick={() => void publish()}>نشر</button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {sourceId ? <p className="text-xs text-ink-500">{sourceId}</p> : null}
    </div>
  );
}
