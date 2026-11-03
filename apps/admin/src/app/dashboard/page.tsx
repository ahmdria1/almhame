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

const PLAN_LABELS: Record<string, string> = {
  free: "المجانية",
  basic: "الأساسية",
  pro: "الاحترافية",
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
  const planTotal = Object.values(stats.subscriptionsByPlan).reduce((sum, count) => sum + count, 0);
  return (
    <section>
      <h2 className="text-[32px] font-bold leading-[48px] text-ink-900">نظرة عامة</h2>
      <p className="mt-1 text-base text-ink-700">إجماليات فقط. لا يُعرض نص القضايا أو المذكرات.</p>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl border border-ink-200 bg-white p-5">
            <p className="text-sm text-ink-500">{label}</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-navy-700">{value}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[20px] border border-ink-200 bg-white p-5">
          <h3 className="text-xl font-semibold text-ink-900">الاشتراكات حسب الباقة</h3>
          <p className="mt-1 text-sm text-ink-500">{planTotal} اشتراكًا</p>
          <ul className="mt-4 grid gap-3">
            {Object.entries(stats.subscriptionsByPlan).map(([plan, count]) => {
              const width = planTotal ? Math.round((count / planTotal) * 100) : 0;
              return (
                <li key={plan}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{width}%</span>
                    <span>{PLAN_LABELS[plan] || plan}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100">
                    <div className="h-2 rounded-full bg-teal-600" style={{ width: `${width}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="rounded-[20px] border border-ink-200 bg-white p-5">
          <h3 className="text-xl font-semibold text-ink-900">المذكرات حسب المحكمة</h3>
          <CourtBars rows={stats.memosByCourt} />
        </section>
      </div>
    </section>
  );
}
