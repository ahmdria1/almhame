"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";

const AMOUNTS = [10000, 25000, 50000, 100000];

export default function WalletPage() {
  const { t, client } = useApp();
  const [data, setData] = useState<{ balanceHalalas: number; transactions: { id: string; type: string; amountHalalas: number; description: string; createdAt: string }[]; invoices: { id: string; number: string; totalHalalas: number; vatHalalas: number; issuedAt: string; lineDescription: string }[] } | null>(null);

  async function load() {
    setData(await client.wallet());
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function topup(amountHalalas: number) {
    const result = await client.checkout({ purpose: "topup", amountHalalas });
    window.location.href = result.redirectUrl;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("wallet.title")}</h1>
      <p className="text-ink-500">{t("wallet.subtitle")}</p>
      <section className="mt-6 rounded-3xl bg-navy-700 p-6 text-white">
        <p className="text-sm text-white/70">{t("wallet.balance")}</p>
        <p className="mt-2 text-4xl font-bold">{((data?.balanceHalalas || 0) / 100).toFixed(2)} {t("common.sar")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {AMOUNTS.map((amount) => (
            <button key={amount} data-testid={`topup-${amount / 100}`} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void topup(amount)}>
              {amount / 100} {t("common.sar")}
            </button>
          ))}
        </div>
      </section>
      <p className="mt-3 text-xs text-ink-500">{t("wallet.vatNote")}</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="font-semibold">{t("wallet.tx")}</h2>
          {(data?.transactions.length || 0) === 0 ? <p className="mt-3 text-sm text-ink-500">{t("wallet.txEmpty")}</p> : data?.transactions.map((row) => (
            <div key={row.id} className="mt-2 flex justify-between rounded-2xl border border-ink-200 px-3 py-3 text-sm dark:border-white/10">
              <span>{row.description}</span>
              <span className={row.amountHalalas < 0 ? "text-danger" : "text-success"}>{(row.amountHalalas / 100).toFixed(2)}</span>
            </div>
          ))}
        </section>
        <section>
          <h2 className="font-semibold">{t("wallet.invoices")}</h2>
          {(data?.invoices.length || 0) === 0 ? <p className="mt-3 text-sm text-ink-500">{t("wallet.invoiceEmpty")}</p> : data?.invoices.map((row) => (
            <div key={row.id} className="mt-2 rounded-2xl border border-ink-200 px-3 py-3 text-sm dark:border-white/10">
              <p className="font-semibold">{row.number}</p>
              <p className="text-ink-500">{row.lineDescription} · {(row.totalHalalas / 100).toFixed(2)} {t("common.sar")}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
