"use client";

import { useEffect, useState } from "react";
import { AccountFrame } from "@/components/account-frame";
import { Skeleton } from "@/components/skeleton";
import { useApp } from "@/lib/providers";

export default function VaultPage() {
  const { t, client } = useApp();
  const [rows, setRows] = useState<{ id: string; filename: string; byteSize: number }[] | null>(null);
  useEffect(() => { client.documents().then((result) => setRows(result.documents)).catch(() => setRows([])); }, [client]);
  return (
    <AccountFrame title={t("vault.title")}>
      {rows === null ? <Skeleton className="mt-6 h-20" /> : rows.length === 0 ? <p className="mt-4 text-ink-500">{t("vault.empty")}</p> : (
        <ul className="mt-6 grid gap-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-ink-200 px-4 py-3 dark:border-white/10">
              <p className="font-semibold">{row.filename}</p>
              <p className="text-xs text-ink-500">{Math.ceil(row.byteSize / 1024)} KB</p>
            </li>
          ))}
        </ul>
      )}
    </AccountFrame>
  );
}
