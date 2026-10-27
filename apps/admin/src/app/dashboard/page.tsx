"use client";

import { FormEvent, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api";

type Stats = {
  users: number;
  activeSubscriptions: number;
  revenueHalalas: number;
  memos: number;
  memosByCourt: Record<string, number>;
  subscriptionsByPlan: Record<string, number>;
  corpus: { laws: number; articles: number; sharia: number; sampleArticles: number };
};

const COURTS: Record<string, string> = {
  general: "العامة",
  criminal: "الجزائية",
  personal_status: "الأحوال",
  labor: "العمالية",
  commercial: "التجارية",
  enforcement: "التنفيذ",
  administrative: "المظالم",
  appeal: "الاستئناف",
  supreme: "العليا",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [importNote, setImportNote] = useState("");

  async function load() {
    const token = sessionStorage.getItem("elw_admin");
    const response = await fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      window.location.href = "../";
      return;
    }
    setStats(await response.json());
  }

  useEffect(() => { load().catch(() => setError("تعذر التحميل")); }, []);

  async function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = (event.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const token = sessionStorage.getItem("elw_admin");
    const response = await fetch(`${API}/admin/corpus/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.name.endsWith(".csv") ? "text/csv" : "application/json",
      },
      body: text,
    });
    setImportNote(response.ok ? "تم الاستيراد" : "رُفض الملف");
    await load();
  }

  if (!stats) return <p className="p-8">{error || "جارٍ التحميل…"}</p>;
  const cards = [
    ["المستخدمون", stats.users],
    ["اشتراكات نشطة", stats.activeSubscriptions],
    ["الإيراد (ر.س)", (stats.revenueHalalas / 100).toFixed(2)],
    ["المذكرات", stats.memos],
  ];
  const max = Math.max(1, ...Object.values(stats.memosByCourt));
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-600">الإدارة</p>
          <h1 className="text-3xl font-bold text-navy-700">نظرة عامة</h1>
          <p className="text-sm text-ink-500">إجماليات فقط. لا يُعرض نص المحادثات أو المذكرات.</p>
        </div>
        <button type="button" className="text-sm" onClick={() => { sessionStorage.removeItem("elw_admin"); window.location.href = "../"; }}>خروج</button>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={String(label)} className="rounded-3xl border border-ink-200 bg-white p-4">
            <p className="text-sm text-ink-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-navy-700">{value}</p>
          </article>
        ))}
      </div>
      <section className="mt-6 rounded-3xl border border-ink-200 bg-white p-5">
        <h2 className="font-semibold">المذكرات حسب المحكمة</h2>
        <div className="mt-4 grid gap-2">
          {Object.entries(stats.memosByCourt).map(([court, count]) => (
            <div key={court} className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-sm">
              <span>{COURTS[court] || court}</span>
              <div className="h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-teal-600" style={{ width: `${(count / max) * 100}%` }} /></div>
              <span>{count}</span>
            </div>
          ))}
          {Object.keys(stats.memosByCourt).length === 0 ? <p className="text-sm text-ink-500">لا مذكرات بعد</p> : null}
        </div>
      </section>
      <section className="mt-6 rounded-3xl border border-ink-200 bg-white p-5">
        <h2 className="font-semibold">المدونة</h2>
        <p className="mt-2 text-sm text-ink-500">مواد العيّنة: {stats.corpus.sampleArticles} من {stats.corpus.articles}. مصادر شرعية: {stats.corpus.sharia}.</p>
        <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={onImport}>
          <input name="file" type="file" accept=".json,.csv,application/json,text/csv" className="text-sm" />
          <button className="rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white" type="submit">استيراد JSON أو CSV</button>
        </form>
        {importNote ? <p className="mt-2 text-sm">{importNote}</p> : null}
      </section>
    </main>
  );
}
