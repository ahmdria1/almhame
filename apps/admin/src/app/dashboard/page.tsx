"use client";

import { useEffect, useState } from "react";
import { CourtBars } from "../../components/bars";
import { adminFetch } from "../../lib/api";

type Stats = {
  users: number;
  activeSubscriptions: number;
  revenueHalalas: number;
  memos: number;
  memosByCourt: Record<string, number>;
  subscriptionsByPlan: Record<string, number>;
};

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminFetch<Stats>("/admin/stats").then(setStats).catch((err) => setError(err.message));
  }, []);
  if (!stats) return <p>{error || "جارٍ التحميل…"}</p>;
  const cards = [
    ["المستخدمون", stats.users],
    ["اشتراكات نشطة", stats.activeSubscriptions],
    ["الإيراد (ر.س)", (stats.revenueHalalas / 100).toFixed(2)],
    ["المذكرات", stats.memos],
  ];
  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">نظرة عامة</h2>
      <p className="mt-1 text-sm text-ink-500">إجماليات فقط. لا يُعرض نص القضايا أو المذكرات.</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl border border-ink-200 bg-white p-4">
            <p className="text-sm text-ink-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-navy-700">{value}</p>
          </article>
        ))}
      </div>
      <h3 className="mt-8 font-bold">الاشتراكات حسب الباقة</h3>
      <ul className="mt-2 text-sm">
        {Object.entries(stats.subscriptionsByPlan).map(([plan, count]) => (
          <li key={plan}>{plan}: {count}</li>
        ))}
      </ul>
      <h3 className="mt-6 font-bold">المذكرات حسب المحكمة</h3>
      <CourtBars rows={stats.memosByCourt} />
    </section>
  );
}
