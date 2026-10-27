"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/api";

type Users = {
  total: number;
  verified: number;
  unverified: number;
  rows: { id: string; email: string; phone: string; planCode: string; status: string; createdAt: string }[];
};

export default function UsersPage() {
  const [data, setData] = useState<Users | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminFetch<Users>("/admin/users").then(setData).catch((err) => setError(err.message));
  }, []);
  if (!data) return <p>{error || "جارٍ التحميل…"}</p>;
  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">المستخدمون</h2>
      <p className="mt-1 text-sm text-ink-500">حالة الحساب فقط. لا يُعرض محتوى المحادثات أو المذكرات.</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 flex gap-3 text-sm">
        <span>الكل: {data.total}</span>
        <span>مفعّل: {data.verified}</span>
        <span>بانتظار التأكيد: {data.unverified}</span>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-ink-200 bg-white">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="bg-ink-100">
            <tr>
              <th className="p-3">البريد</th>
              <th className="p-3">الجوال</th>
              <th className="p-3">الباقة</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">تاريخ الإنشاء</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-t border-ink-200">
                <td className="p-3">{row.email}</td>
                <td className="p-3">{row.phone}</td>
                <td className="p-3">{row.planCode}</td>
                <td className="p-3">{row.status === "active" ? "مفعّل" : "غير مفعّل"}</td>
                <td className="p-3">{row.createdAt.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
