"use client";

import { SERVICE_CODES, SERVICE_PRICES_HALALAS, type PlanOffer, type ServiceCode } from "@elawyer/types";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";

const SERVICE_KEY: Record<ServiceCode, string> = {
  review: "plans.serviceReview",
  defense: "plans.serviceDefense",
  lawsuit: "plans.serviceClaim",
  objection: "plans.serviceObjection",
  chat_pack: "plans.serviceChatPack",
};

export default function PlansPage() {
  const { t, client, user } = useApp();
  const [plans, setPlans] = useState<PlanOffer[]>([]);
  const [yearly, setYearly] = useState(false);
  useEffect(() => { client.plans().then((result) => setPlans(result.plans)).catch(() => undefined); }, [client]);

  async function choose(plan: PlanOffer) {
    if (plan.code === "free") return;
    const result = await client.checkout({ purpose: "subscription", planCode: plan.code, cycle: yearly ? "yearly" : "monthly" });
    window.location.href = result.redirectUrl;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("plans.title")}</h1>
        <div className="rounded-full bg-ink-100 p-1 text-sm font-semibold dark:bg-white/10">
          <button type="button" className={`inline-flex min-h-11 items-center rounded-full px-4 ${!yearly ? "bg-white dark:bg-navy-700" : ""}`} onClick={() => setYearly(false)}>{t("plans.monthly")}</button>
          <button type="button" className={`inline-flex min-h-11 items-center rounded-full px-4 ${yearly ? "bg-white dark:bg-navy-700" : ""}`} onClick={() => setYearly(true)}>{t("plans.yearly")}</button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const price = yearly ? plan.yearlyHalalas : plan.priceHalalas;
          const current = user?.planCode === plan.code;
          return (
            <article key={plan.code} className={`rounded-3xl border p-5 ${plan.code === "pro" ? "border-teal-600 bg-navy-700 text-white" : "paper border-ink-200 dark:border-white/10"}`}>
              {plan.code === "pro" ? <p className="text-xs font-semibold text-teal-300">{t("plans.popular")}</p> : null}
              <h2 className="text-lg font-semibold">{t(`plans.${plan.code}Name`)}</h2>
              <p className="mt-3 text-4xl font-bold">{(price / 100).toFixed(0)}</p>
              <p className="text-sm opacity-80">{yearly ? t("common.year") : t("plans.perMonth")}</p>
              <p className="mt-3 text-sm leading-7 opacity-80">{t(`plans.${plan.code}Desc`)}</p>
              <button type="button" disabled={current || plan.code === "free"} onClick={() => void choose(plan)} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-3 text-sm font-semibold ${plan.code === "pro" ? "bg-white text-navy-700" : "bg-navy-700 text-white"}`}>
                {current ? t("plans.current") : t("plans.choose")}
              </button>
            </article>
          );
        })}
      </div>
      <ul className="mt-6 space-y-2 text-sm text-ink-500">
        <li>{t("plans.payg")}</li>
        {SERVICE_CODES.map((code) => (
          <li key={code} className="flex items-center justify-between gap-3">
            <span>{t(SERVICE_KEY[code], { price: (SERVICE_PRICES_HALALAS[code] / 100).toFixed(0) })}</span>
            {code === "review" || code === "chat_pack" ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white"
                onClick={() => {
                  void client.checkout({ purpose: "service", serviceCode: code }).then((result) => {
                    window.location.href = result.redirectUrl;
                  });
                }}
              >
                {t("plans.choose")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
