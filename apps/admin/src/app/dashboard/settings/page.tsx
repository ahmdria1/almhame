"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/api";

type Settings = {
  nodeEnv: string;
  llmProvider: string;
  embeddingProvider: string;
  paymentGateway: string;
  smsProvider: string;
  smtpConfigured: boolean;
  emailDebug: boolean;
};

const LABELS: Record<string, string> = {
  nodeEnv: "بيئة التشغيل",
  llmProvider: "مزود الصياغة",
  embeddingProvider: "مزود التضمين",
  paymentGateway: "بوابة الدفع",
  smsProvider: "مزود الرسائل",
  smtpConfigured: "البريد مهيأ",
  emailDebug: "إظهار رمز التجربة",
};

export default function SettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminFetch<Settings>("/admin/settings").then(setData).catch((err) => setError(err.message));
  }, []);
  if (!data) return <p>{error || "جارٍ التحميل…"}</p>;
  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">الإعدادات</h2>
      <p className="mt-1 text-sm text-ink-500">حالة المزودين فقط. لا تُعرض المفاتيح.</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <dl className="mt-4 grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-sm">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4 border-b border-ink-100 py-2">
            <dt>{LABELS[key] || key}</dt>
            <dd className="font-semibold">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
