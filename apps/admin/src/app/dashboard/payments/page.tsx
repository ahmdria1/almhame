"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/api";

type Payments = {
  invoices: { id: string; number: string; totalHalalas: number; vatHalalas: number; issuedAt: string; email: string }[];
  intents: { id: string; purpose: string; amountHalalas: number; status: string; gateway: string; createdAt: string; email: string }[];
};

export default function PaymentsPage() {
  const [data, setData] = useState<Payments | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminFetch<Payments>("/admin/payments").then(setData).catch((err) => setError(err.message));
  }, []);
  if (!data) return <p>{error || "جارٍ التحميل…"}</p>;
  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">المدفوعات والفواتير</h2>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <h3 className="mt-6 font-bold">الفواتير</h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-ink-200 bg-white">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="bg-ink-100"><tr><th className="p-3">الرقم</th><th className="p-3">البريد</th><th className="p-3">الإجمالي</th><th className="p-3">الضريبة</th><th className="p-3">التاريخ</th></tr></thead>
          <tbody>
            {data.invoices.length === 0 ? <tr><td className="p-3" colSpan={5}>لا فواتير بعد</td></tr> : data.invoices.map((row) => (
              <tr key={row.id} className="border-t border-ink-200">
                <td className="p-3">{row.number}</td>
                <td className="p-3">{row.email}</td>
                <td className="p-3">{(row.totalHalalas / 100).toFixed(2)}</td>
                <td className="p-3">{(row.vatHalalas / 100).toFixed(2)}</td>
                <td className="p-3">{row.issuedAt.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="mt-6 font-bold">عمليات الدفع</h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-ink-200 bg-white">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="bg-ink-100"><tr><th className="p-3">الغرض</th><th className="p-3">البريد</th><th className="p-3">المبلغ</th><th className="p-3">الحالة</th><th className="p-3">البوابة</th></tr></thead>
          <tbody>
            {data.intents.length === 0 ? <tr><td className="p-3" colSpan={5}>لا عمليات بعد</td></tr> : data.intents.map((row) => (
              <tr key={row.id} className="border-t border-ink-200">
                <td className="p-3">{row.purpose}</td>
                <td className="p-3">{row.email}</td>
                <td className="p-3">{(row.amountHalalas / 100).toFixed(2)}</td>
                <td className="p-3">{row.status}</td>
                <td className="p-3">{row.gateway}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
