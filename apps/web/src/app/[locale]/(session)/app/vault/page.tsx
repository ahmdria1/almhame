"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/skeleton";
import { useApp } from "@/lib/providers";

export default function VaultPage() {
  const { t, client } = useApp();
  const [rows, setRows] = useState<{ id: string; filename: string; byteSize: number }[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setFailed(false);
    client.documents().then((result) => setRows(result.documents)).catch(() => {
      setRows(null);
      setFailed(true);
    });
  }, [client, attempt]);

  async function download(id: string, filename: string) {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api"}/documents/${id}/download`, { credentials: "include" });
    if (!response.ok) {
      setFailed(true);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("vault.title")}</h1>
      {failed ? (
        <div className="mt-4">
          <p className="text-ink-700">{t("common.error")}</p>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white" onClick={() => setAttempt((value) => value + 1)}>{t("common.retry")}</button>
        </div>
      ) : rows === null ? <Skeleton className="mt-6 h-20" /> : rows.length === 0 ? <p className="mt-4 text-ink-500">{t("vault.empty")}</p> : (
        <ul className="mt-6 grid gap-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-2xl border border-ink-200 px-4 py-3 dark:border-white/10">
              <div>
                <p className="font-semibold">{row.filename}</p>
                <p className="text-xs text-ink-500">{Math.ceil(row.byteSize / 1024)} KB</p>
              </div>
              <button type="button" className="min-h-11 text-sm font-semibold text-teal-700" onClick={() => void download(row.id, row.filename)}>{t("common.download")}</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
