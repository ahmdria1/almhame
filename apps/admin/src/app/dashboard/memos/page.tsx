"use client";

import { useEffect, useState } from "react";
import { CourtBars } from "../../../components/bars";
import { adminFetch } from "../../../lib/api";

export default function MemosPage() {
  const [rows, setRows] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminFetch<{ memosByCourt: Record<string, number> }>("/admin/stats")
      .then((stats) => setRows(stats.memosByCourt))
      .catch((err) => setError(err.message));
  }, []);
  if (!rows) return <p>{error || "جارٍ التحميل…"}</p>;
  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">المذكرات حسب المحكمة</h2>
      <p className="mt-1 text-sm text-ink-500">عدد المذكرات لكل محكمة. النص غير متاح هنا.</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <CourtBars rows={rows} />
    </section>
  );
}
