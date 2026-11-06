"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminFetch } from "../../../lib/api";
import { pastedStatuteBlock, statuteError, statuteImportBody, unchangedOfficialImport, type ArticleDraft } from "../../../lib/statute-form";

type LawRow = { key: string; nameAr: string; articles: number; issuedHijri: string; sourceUrl: string; statusLabel: string };

type Corpus = { byLaw: LawRow[] };

const emptyArticle = (): ArticleDraft => ({ number: "", textAr: "" });

export default function StatutesPage() {
  const [rows, setRows] = useState<LawRow[] | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [key, setKey] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [version, setVersion] = useState("");
  const [articles, setArticles] = useState<ArticleDraft[]>([emptyArticle()]);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  function load() {
    return adminFetch<Corpus>("/admin/corpus").then((data) => setRows(data.byLaw)).catch((err) => {
      setRows([]);
      setError(statuteError(err instanceof Error ? err.message : "تعذر التحميل"));
    });
  }

  useEffect(() => {
    void load();
  }, []);

  function fill(row: LawRow) {
    setEditing(true);
    setKey(row.key);
    setNameAr(row.nameAr);
    setSourceUrl(row.sourceUrl || "");
    setVersion("");
    setArticles([emptyArticle()]);
    setSaved("");
    setError("");
  }

  function reset() {
    setEditing(false);
    setKey("");
    setNameAr("");
    setSourceUrl("");
    setVersion("");
    setArticles([emptyArticle()]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved("");
    const draft = { key, nameAr, sourceUrl, version, articles };
    const blocked = pastedStatuteBlock(draft);
    if (blocked) {
      setError(blocked);
      return;
    }
    setPending(true);
    try {
      await adminFetch("/admin/corpus/import?confirmOfficial=true", {
        method: "POST",
        body: JSON.stringify(statuteImportBody(draft)),
      });
      setSaved(editing ? "حُفظ تعديل النظام." : "أُضيف النظام.");
      reset();
      await load();
    } catch (err) {
      setError(statuteError(err instanceof Error ? err.message : "تعذر الحفظ"));
    } finally {
      setPending(false);
    }
  }

  async function onImport(file: File) {
    setError("");
    setSaved("");
    const decision = unchangedOfficialImport(await file.text());
    if ("error" in decision) {
      setError(decision.error);
      return;
    }
    setPending(true);
    try {
      const savedCount = await adminFetch<{ laws: number }>("/admin/corpus/import?confirmOfficial=true", {
        method: "POST",
        body: decision.body,
      });
      if (!savedCount.laws) {
        setError("لم يُحفظ نظام.");
        return;
      }
      setSaved("استُورد النص الرسمي.");
      reset();
      await load();
    } catch (err) {
      setError(statuteError(err instanceof Error ? err.message : "تعذر الاستيراد"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">الأنظمة الرسمية</h2>
      <p className="mt-1 text-sm leading-7 text-ink-500">الصق النص الرسمي كما نُشر، أو استورد ملفه. الاستشهاد ورابط المصدر مطلوبان. لا يُكتب نص النظام من هذه الشاشة. القائمة لا تعيد نص المواد المخزّن؛ عند التعديل تُستبدل أرقام المواد التي تلصقها.</p>
      {rows === null ? <p className="mt-4">جارٍ التحميل…</p> : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-ink-200 bg-white">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="bg-ink-100">
              <tr>
                <th className="p-3">النظام</th>
                <th className="p-3">المفتاح</th>
                <th className="p-3">المواد</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? <tr><td className="p-3" colSpan={4}>لا أنظمة مخزّنة</td></tr> : rows.map((row) => (
                <tr key={row.key} className="border-t border-ink-200">
                  <td className="p-3">{row.nameAr}</td>
                  <td className="p-3">{row.key}</td>
                  <td className="p-3">{row.articles}</td>
                  <td className="p-3">
                    <button type="button" className="min-h-11 font-semibold text-teal-700" onClick={() => fill(row)}>تعديل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form className="mt-8 grid max-w-3xl gap-3" onSubmit={(event) => void onSubmit(event)}>
        <h3 className="text-lg font-bold">{editing ? "تعديل نظام" : "إضافة نظام"}</h3>
        <label className="text-sm font-semibold">الاسم الرسمي
          <input value={nameAr} onChange={(event) => setNameAr(event.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3" />
        </label>
        <label className="text-sm font-semibold">المفتاح
          <input value={key} onChange={(event) => setKey(event.target.value)} readOnly={editing} className="mt-1 h-11 w-full rounded-xl border px-3" />
        </label>
        <label className="text-sm font-semibold">رابط المصدر الرسمي
          <input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3" />
        </label>
        <label className="text-sm font-semibold">الاستشهاد الرسمي
          <input value={version} onChange={(event) => setVersion(event.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3" />
        </label>
        <div className="grid gap-3">
          {articles.map((article, index) => (
            <div key={index} className="rounded-2xl border border-ink-200 p-3">
              <label className="text-sm font-semibold">رقم المادة
                <input value={article.number} onChange={(event) => setArticles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, number: event.target.value } : item))} className="mt-1 h-11 w-full rounded-xl border px-3" />
              </label>
              <label className="mt-2 block text-sm font-semibold">النص الرسمي
                <textarea value={article.textAr} onChange={(event) => setArticles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, textAr: event.target.value } : item))} className="mt-1 min-h-28 w-full rounded-xl border p-3" />
              </label>
            </div>
          ))}
          <button type="button" className="min-h-11 text-sm font-semibold text-teal-700" onClick={() => setArticles((current) => [...current, emptyArticle()])}>مادة أخرى</button>
        </div>
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        {saved ? <p className="text-sm text-teal-700">{saved}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="h-11 rounded-xl bg-navy-700 px-4 text-white disabled:opacity-50">{pending ? "جارٍ الحفظ…" : "حفظ النص الرسمي"}</button>
          {editing ? <button type="button" className="h-11 rounded-xl border px-4" onClick={reset}>إلغاء التعديل</button> : null}
          <label className="inline-flex h-11 cursor-pointer items-center rounded-xl border px-4 text-sm font-semibold">
            استيراد ملف رسمي
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void onImport(file);
              }}
            />
          </label>
        </div>
      </form>
    </section>
  );
}
