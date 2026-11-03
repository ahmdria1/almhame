"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/api";

type Report = {
  totals: { tokens: number; requests: number; degraded: number; cached: number };
  byPlan: Record<string, number>;
  byPurpose: Record<string, number>;
};

const PLAN: Record<string, string> = { free: "مجانية", basic: "أساسية", pro: "احترافية" };
const PURPOSE: Record<string, string> = { chat: "محادثة", draft: "صياغة" };

export default function CostsPage() {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminFetch<Report>("/admin/costs").then(setData).catch((err) => setError(err.message));
  }, []);
  if (!data) return <p>{error || "جارٍ التحميل…"}</p>;
  const cards = [
    ["الطلبات", data.totals.requests],
    ["الرموز", data.totals.tokens],
    ["طلبات مخفّضة", data.totals.degraded],
    ["إجابات عامة مخزّنة", data.totals.cached],
  ];
  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">تكلفة التشغيل</h2>
      <p className="mt-1 text-sm text-ink-500">إجماليات فقط. لا يُعرض نص المستخدم ولا معرف حساب.</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl border border-ink-200 bg-white p-4">
            <p className="text-sm text-ink-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-navy-700">{value}</p>
          </article>
        ))}
      </div>
      <h3 className="mt-8 font-bold">حسب الباقة</h3>
      <ul className="mt-2 text-sm">
        {Object.entries(data.byPlan).map(([plan, tokens]) => (
          <li key={plan}>{PLAN[plan] || plan}: {tokens}</li>
        ))}
      </ul>
      <h3 className="mt-6 font-bold">حسب الغرض</h3>
      <ul className="mt-2 text-sm">
        {Object.entries(data.byPurpose).map(([purpose, tokens]) => (
          <li key={purpose}>{PURPOSE[purpose] || purpose}: {tokens}</li>
        ))}
      </ul>
    </section>
  );
}
