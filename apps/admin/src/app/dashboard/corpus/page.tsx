"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/api";

type Corpus = {
  laws: number;
  articles: number;
  sharia: number;
  sampleArticles: number;
  byLaw: { key: string; nameAr: string; articles: number; issuedHijri: string; sourceUrl: string; statusLabel: string }[];
  shariaByKind: Record<string, number>;
  runs: { id: string; status: string; startedAt: string; finishedAt: string | null; laws: number; articles: number; sharia: number; note: string }[];
};

export default function CorpusPage() {
  const [data, setData] = useState<Corpus | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  function load() {
    return adminFetch<Corpus>("/admin/corpus").then(setData).catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) return <p>{error || "جارٍ التحميل…"}</p>;
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-700">قاعدة الأنظمة</h2>
          <p className="mt-1 text-sm text-ink-500">{data.laws} نظامًا، {data.articles} مادة، {data.sharia} مصدرًا شرعيًا. سجلات غير موثّقة: {data.sampleArticles}.</p>
        </div>
        <button
          type="button"
          className="h-11 rounded-xl bg-navy-700 px-4 text-white"
          onClick={async () => {
            setError("");
            try {
              await adminFetch("/admin/corpus/refresh", { method: "POST" });
              setNote("بدأ التحديث. حدّث الصفحة بعد اكتمال الجلب.");
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : "تعذر التحديث");
            }
          }}
        >
          تشغيل التحديث
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {note ? <p className="mt-3 text-sm text-teal-600">{note}</p> : null}
      <h3 className="mt-6 font-bold">عدد المواد لكل نظام</h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-ink-200 bg-white">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="bg-ink-100"><tr><th className="p-3">النظام</th><th className="p-3">المواد</th><th className="p-3">الإصدار</th><th className="p-3">الحالة</th></tr></thead>
          <tbody>
            {data.byLaw.length === 0 ? <tr><td className="p-3" colSpan={4}>لم يُستورد نص بعد</td></tr> : data.byLaw.map((row) => (
              <tr key={row.key} className="border-t border-ink-200">
                <td className="p-3"><a className="text-teal-600" href={row.sourceUrl}>{row.nameAr}</a></td>
                <td className="p-3">{row.articles}</td>
                <td className="p-3">{row.issuedHijri}</td>
                <td className="p-3">{row.statusLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="mt-6 font-bold">المصادر الشرعية</h3>
      <ul className="mt-2 text-sm">
        {Object.entries(data.shariaByKind).map(([kind, count]) => <li key={kind}>{kind}: {count}</li>)}
      </ul>
      <h3 className="mt-6 font-bold">عمليات الاستيراد</h3>
      <ul className="mt-2 text-sm">
        {data.runs.length === 0 ? <li>لا عمليات بعد</li> : data.runs.map((run) => (
          <li key={run.id}>{run.status} — أنظمة {run.laws} — مواد {run.articles} — شرعي {run.sharia} {run.note ? `— ${run.note}` : ""}</li>
        ))}
      </ul>
    </section>
  );
}
