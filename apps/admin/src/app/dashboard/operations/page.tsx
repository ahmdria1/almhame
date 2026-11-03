"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminFetch } from "../../../lib/api";

type Ops = { reports: number; exports: number; pending: number };
type Pending = { id: string; lawKey: string; sourceUrl: string; note: string; status: string };

export default function OperationsPage() {
  const [ops, setOps] = useState<Ops | null>(null);
  const [rows, setRows] = useState<Pending[]>([]);
  const [error, setError] = useState("");
  function load() {
    adminFetch<Ops>("/admin/operations").then(setOps).catch((err) => setError(err.message));
    adminFetch<Pending[]>("/admin/pending-updates").then(setRows).catch(() => setRows([]));
  }
  useEffect(() => { load(); }, []);
  async function scan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lawKey = String(new FormData(event.currentTarget).get("lawKey") || "");
    await adminFetch("/admin/pending-updates/scan", { method: "POST", body: JSON.stringify({ lawKey }) });
    load();
  }
  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">العمليات</h2>
      <p className="mt-1 text-sm text-ink-500">أعداد وبلاغات مراجعة. لا يُعرض نص القضايا.</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {ops ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          <li className="rounded-2xl border border-ink-200 bg-white p-4">بلاغات: {ops.reports}</li>
          <li className="rounded-2xl border border-ink-200 bg-white p-4">تصديرات: {ops.exports}</li>
          <li className="rounded-2xl border border-ink-200 bg-white p-4">تحديثات بانتظار المراجعة: {ops.pending}</li>
        </ul>
      ) : null}
      <form className="mt-6 flex gap-2" onSubmit={(event) => void scan(event)}>
        <input name="lawKey" placeholder="مفتاح النظام" className="h-11 flex-1 rounded-xl border px-3" required />
        <button className="rounded-xl bg-navy-700 px-4 text-white" type="submit">راجع الصفحة الرسمية</button>
      </form>
      <ul className="mt-4 grid gap-2 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-ink-200 bg-white p-3">
            <p className="font-semibold">{row.lawKey}</p>
            <p>{row.note}</p>
            <a className="text-teal-700" href={row.sourceUrl}>{row.sourceUrl}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
