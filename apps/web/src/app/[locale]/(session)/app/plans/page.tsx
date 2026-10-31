"use client";

import type { PlanOffer } from "@elawyer/types";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";

export default function PlansPage() {
  const { t, client, user } = useApp();
  const [plans, setPlans] = useState<PlanOffer[]>([]);
  useEffect(() => { client.plans().then((result) => setPlans(result.plans)).catch(() => undefined); }, [client]);

  async function choose(plan: PlanOffer) {
    if (plan.code === "free") return;
    const result = await client.checkout({ purpose: "subscription", planCode: plan.code });
    window.location.href = result.redirectUrl;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("plans.title")}</h1>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const current = user?.planCode === plan.code;
          return (
            <article key={plan.code} className={`rounded-3xl border p-5 ${plan.code === "pro" ? "border-teal-600 bg-navy-700 text-white" : "paper border-ink-200 dark:border-white/10"}`}>
              {plan.code === "pro" ? <p className="text-sm font-semibold text-teal-300">{t("plans.popular")}</p> : null}
              <h2 className="text-lg font-semibold">{t(`plans.${plan.code}Name`)}</h2>
              <p className="mt-3 text-4xl font-bold">{(plan.priceHalalas / 100).toFixed(0)}</p>
              <p className="text-sm opacity-80">{t("common.sar")}</p>
              <p className="mt-3 text-sm leading-7 opacity-80">{t(`plans.${plan.code}Desc`)}</p>
              <button type="button" disabled={current || plan.code === "free"} onClick={() => void choose(plan)} className={`mt-5 w-full rounded-xl px-3 py-2 text-sm font-semibold ${plan.code === "pro" ? "bg-white text-navy-700" : "bg-navy-700 text-white"}`}>
                {current ? t("plans.current") : t("plans.choose")}
              </button>
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-ink-500">{t("plans.payg", { price: (plans[0]?.payPerMemoHalalas ?? 900) / 100 })}</p>
    </main>
  );
}
