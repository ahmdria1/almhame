"use client";

import { Calendar, FileText, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountFrame } from "@/components/account-frame";
import { useApp } from "@/lib/providers";

const AMOUNTS = [10000, 25000, 50000, 100000];

export default function WalletPage() {
  const { t, client, user, locale } = useApp();
  const [data, setData] = useState<{ balanceHalalas: number; transactions: { id: string; type: string; amountHalalas: number; description: string; createdAt: string }[]; invoices: { id: string; number: string; totalHalalas: number; vatHalalas: number; issuedAt: string; lineDescription: string }[] } | null>(null);
  const [failed, setFailed] = useState(false);

  async function load() {
    try {
      setData(await client.wallet());
      setFailed(false);
    } catch {
      setData(null);
      setFailed(true);
    }
  }
  useEffect(() => { void load(); }, []);

  async function topup(amountHalalas: number) {
    const result = await client.checkout({ purpose: "topup", amountHalalas });
    window.location.href = result.redirectUrl;
  }

  const renews = user?.planRenewsAt ? new Date(user.planRenewsAt).toLocaleDateString(locale === "ar" ? "ar-SA" : locale) : "";
  return (
    <AccountFrame title={t("wallet.title")} subtitle={t("wallet.subtitle")}>
      <section className="flex flex-col gap-6 rounded-3xl bg-navy-700 px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base text-ink-300">{t("wallet.balance")}</p>
          {failed || !data ? (
            <div className="mt-3">
              <p>{failed ? t("common.error") : t("common.loading")}</p>
              {failed ? <button type="button" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-navy-700" onClick={() => void load()}>{t("common.retry")}</button> : null}
            </div>
          ) : (
            <p className="mt-1 text-5xl font-bold leading-none">{(data.balanceHalalas / 100).toFixed(2)} <span className="text-xl font-semibold text-ink-300">{t("common.sar")}</span></p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/plans" className="inline-flex h-14 items-center rounded-[14px] bg-white px-6 text-xl font-semibold text-navy-700">{t("nav.plans")}</Link>
          {AMOUNTS.map((amount) => (
            <button key={amount} data-testid={`topup-${amount / 100}`} className="inline-flex h-14 items-center rounded-[14px] bg-teal-600 px-5 text-base font-semibold text-white" type="button" onClick={() => void topup(amount)}>
              {amount / 100} {t("common.sar")}
            </button>
          ))}
        </div>
      </section>
      <p className="mt-3 text-sm text-ink-500">{t("wallet.vatNote")}</p>
      {user ? (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-white/10 dark:bg-navy-800">
            <p className="flex items-center justify-end gap-2 text-ink-700"><Star size={18} className="text-teal-600" />{t("plans.title")}</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900 dark:text-white">{t(`plans.${user.planCode}Name`)}</p>
          </article>
          <article className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-white/10 dark:bg-navy-800">
            <p className="flex items-center justify-end gap-2 text-ink-700"><Calendar size={18} className="text-teal-600" />{t("nav.subscription")}</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900 dark:text-white">{renews || "—"}</p>
          </article>
          <article className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-white/10 dark:bg-navy-800">
            <p className="flex items-center justify-end gap-2 text-ink-700"><FileText size={18} className="text-teal-600" />{t("nav.memos")}</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900 dark:text-white">{user.memoRemaining} / {user.memoLimit}</p>
          </article>
        </div>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-[20px] border border-ink-200 bg-white dark:border-white/10 dark:bg-navy-800">
          <h2 className="bg-ink-100 px-5 py-3 text-sm font-semibold text-ink-500 dark:bg-white/5">{t("wallet.tx")}</h2>
          {(data?.transactions.length || 0) === 0 ? <p className="px-5 py-4 text-sm text-ink-500">{t("wallet.txEmpty")}</p> : data?.transactions.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4 border-t border-ink-100 px-5 py-4 text-sm dark:border-white/10">
              <span className="font-semibold">{row.description}</span>
              <span className={row.amountHalalas < 0 ? "font-semibold text-danger" : "font-semibold text-success"}>{(row.amountHalalas / 100).toFixed(2)} {t("common.sar")}</span>
            </div>
          ))}
        </section>
        <section className="overflow-hidden rounded-[20px] border border-ink-200 bg-white dark:border-white/10 dark:bg-navy-800">
          <h2 className="bg-ink-100 px-5 py-3 text-sm font-semibold text-ink-500 dark:bg-white/5">{t("wallet.invoices")}</h2>
          {(data?.invoices.length || 0) === 0 ? <p className="px-5 py-4 text-sm text-ink-500">{t("wallet.invoiceEmpty")}</p> : data?.invoices.map((row) => (
            <div key={row.id} className="border-t border-ink-100 px-5 py-4 text-sm dark:border-white/10">
              <p className="font-semibold">{row.number}</p>
              <p className="text-ink-500">{row.lineDescription} · {(row.totalHalalas / 100).toFixed(2)} {t("common.sar")}</p>
            </div>
          ))}
        </section>
      </div>
    </AccountFrame>
  );
}
