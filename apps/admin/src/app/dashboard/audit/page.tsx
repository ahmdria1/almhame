"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/api";

type Row = { id: string; actorType: string; action: string; createdAt: string; ip: string | null };

export default function AuditPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminFetch<Row[]>("/admin/audit").then(setRows).catch((err) => setError(err.message));
  }, []);
  if (!rows) return <p>{error || "جارٍ التحميل…"}</p>;
  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">سجل العمليات</h2>
      <p className="mt-1 text-sm text-ink-500">المسار والنتيجة فقط، من غير محتوى الملفات.</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-ink-200 bg-white">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="bg-ink-100"><tr><th className="p-3">الوقت</th><th className="p-3">الفاعل</th><th className="p-3">الإجراء</th><th className="p-3">العنوان</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td className="p-3" colSpan={4}>لا سجلات بعد</td></tr> : rows.map((row) => (
              <tr key={row.id} className="border-t border-ink-200">
                <td className="p-3">{row.createdAt.replace("T", " ").slice(0, 19)}</td>
                <td className="p-3">{row.actorType}</td>
                <td className="p-3">{row.action}</td>
                <td className="p-3">{row.ip || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
