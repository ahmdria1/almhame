"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/api";

type Net = { code: string; label: string; priceHalalas: number; netHalalas: number };

type Settings = {
  nodeEnv: string;
  llmProvider: string;
  embeddingProvider: string;
  paymentGateway: string;
  smsProvider: string;
  smtpConfigured: boolean;
  najiz: string;
  emailDebug: boolean;
  vatRate: number;
  gatewayFeeRate: number;
  gatewayFeeFixedHalalas: number;
  nets: Net[];
};

const LABELS: Record<string, string> = {
  nodeEnv: "بيئة التشغيل",
  llmProvider: "مزود الصياغة",
  embeddingProvider: "مزود التضمين",
  paymentGateway: "بوابة الدفع",
  smsProvider: "مزود الرسائل",
  smtpConfigured: "البريد مهيأ",
  najiz: "ربط المحكمة",
  emailDebug: "إظهار رمز التحقق في الاستجابة",
};

function sar(halalas: number) {
  return (halalas / 100).toFixed(2);
}

export default function SettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminFetch<Settings>("/admin/settings").then(setData).catch((err) => setError(err.message));
  }, []);
  if (!data) return <p>{error || "جارٍ التحميل…"}</p>;
  const status = {
    nodeEnv: data.nodeEnv,
    llmProvider: data.llmProvider,
    embeddingProvider: data.embeddingProvider,
    paymentGateway: data.paymentGateway,
    smsProvider: data.smsProvider,
    smtpConfigured: data.smtpConfigured,
    najiz: data.najiz,
    emailDebug: data.emailDebug,
  };
  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">الإعدادات</h2>
      <p className="mt-1 text-sm text-ink-500">حالة المزودين فقط. لا تُعرض المفاتيح.</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <dl className="mt-4 grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-sm">
        {Object.entries(status).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4 border-b border-ink-100 py-2">
            <dt>{LABELS[key] || key}</dt>
            <dd className="font-semibold">{String(value)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-b border-ink-100 py-2">
          <dt>نسبة ضريبة القيمة المضافة</dt>
          <dd className="font-semibold">{Math.round(data.vatRate * 1000) / 10}٪</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-ink-100 py-2">
          <dt>رسوم بوابة الدفع</dt>
          <dd className="font-semibold">{data.gatewayFeeRate * 100}٪ + {sar(data.gatewayFeeFixedHalalas)} ر.س</dd>
        </div>
      </dl>
      <h3 className="mt-8 font-bold">صافي المالك لكل بند</h3>
      <p className="mt-1 text-sm text-ink-500">السعر المعروض شامل. الصافي = السعر × (1 ÷ (1 + الضريبة) − نسبة الرسوم) − الرسم الثابت.</p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-start text-ink-500">
            <th className="py-2 text-start">البند</th>
            <th className="py-2 text-start">السعر الشامل</th>
            <th className="py-2 text-start">الصافي</th>
          </tr>
        </thead>
        <tbody>
          {data.nets.map((item) => (
            <tr key={item.code} className="border-t border-ink-100">
              <td className="py-2">{item.label}</td>
              <td className="py-2">{sar(item.priceHalalas)} ر.س</td>
              <td className="py-2">{sar(item.netHalalas)} ر.س</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
