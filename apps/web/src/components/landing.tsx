"use client";

import { COURTS } from "@elawyer/types";
import { Check, Lock, Scale } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SiteFooter, SiteHeader } from "./chrome";
import { Logo } from "./logo";
import { useApp } from "@/lib/providers";

const FEATURES = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;
const STEPS = ["s1", "s2", "s3", "s4"] as const;
const FAQS = ["q1", "q2", "q3", "q4"] as const;
const PLAN_CARDS = [
  ["free", "0", "plans.freeName", "plans.freeDesc"],
  ["basic", "99", "plans.basicName", "plans.basicDesc"],
  ["pro", "249", "plans.proName", "plans.proDesc"],
  ["office", "599", "plans.officeName", "plans.officeDesc"],
] as const;

export function Landing() {
  const { t } = useApp();
  const [open, setOpen] = useState("q1");
  return (
    <div className="bg-canvas dark:bg-navy-900">
      <SiteHeader />
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
        <div>
          <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-700">{t("app.platformBadge")}</span>
          <h1 className="mt-4 text-4xl font-bold leading-[1.35] text-navy-700 dark:text-white md:text-[56px] md:leading-[76px]">{t("landing.heroTitle")}</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-ink-500">{t("landing.heroSubtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-navy-700 px-5 py-3 font-semibold text-white">{t("landing.ctaPrimary")}</Link>
            <a href="#how" className="rounded-xl border border-ink-200 bg-white px-5 py-3 font-semibold text-navy-700 dark:border-white/10 dark:bg-navy-800 dark:text-white">{t("landing.ctaSecondary")}</a>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-500"><Lock size={14} /> {t("landing.trust")}</p>
        </div>
        <div className="paper rounded-3xl border border-ink-200 p-4 shadow-card dark:border-white/10">
          <div className="mb-3 flex items-center justify-between text-sm font-semibold">
            <span>{t("landing.heroCase")}</span>
            <span className="text-ink-400">•••</span>
          </div>
          <div className="ms-8 rounded-2xl bg-navy-700 px-4 py-3 text-sm leading-7 text-white">{t("landing.heroUser")}</div>
          <div className="mt-3 flex gap-2">
            <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700"><Scale size={16} /></span>
            <div className="rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm leading-7 dark:border-white/10 dark:bg-navy-900">{t("landing.heroCounsel")}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-brand-500">{t("landing.chipLabor")}</span>
            <span className="rounded-full bg-teal-100 px-3 py-1 text-teal-700">{t("landing.chipProcedure")}</span>
            <span className="rounded-full bg-success-soft px-3 py-1 text-success">{t("landing.chipMaxim")}</span>
          </div>
        </div>
      </section>
      <section id="features" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-3xl font-bold text-navy-700 dark:text-white md:text-[40px] md:leading-[58px]">{t("landing.featuresTitle")}</h2>
        <p className="mt-2 text-ink-500">{t("landing.featuresSubtitle")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURES.map((key) => (
            <article key={key} className="paper rounded-3xl border border-ink-200 p-5 dark:border-white/10">
              <Logo size={36} />
              <h3 className="mt-4 text-xl font-semibold">{t(`landing.${key}Title`)}</h3>
              <p className="mt-2 text-sm leading-7 text-ink-500">{t(`landing.${key}Body`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="courts" className="bg-white py-12 dark:bg-navy-800">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-navy-700 dark:text-white">{t("landing.courtsTitle")}</h2>
          <p className="mt-2 text-ink-500">{t("landing.courtsSubtitle")}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COURTS.map((court) => (
              <div key={court} className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-canvas px-4 py-4 dark:border-white/10 dark:bg-navy-900">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-100 text-teal-700"><Scale size={18} /></span>
                <span className="font-semibold">{t(`courts.${court}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="how" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-3xl font-bold text-navy-700 dark:text-white">{t("landing.howTitle")}</h2>
        <p className="mt-2 text-ink-500">{t("landing.howSubtitle")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map((key, index) => (
            <article key={key} className="paper rounded-3xl border border-ink-200 p-5 dark:border-white/10">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-700 text-sm font-bold text-white">{index + 1}</span>
              <h3 className="mt-4 font-semibold">{t(`landing.${key}Title`)}</h3>
              <p className="mt-2 text-sm leading-7 text-ink-500">{t(`landing.${key}Body`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="plans" className="bg-white py-14 dark:bg-navy-800">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-navy-700 dark:text-white">{t("landing.plansTitle")}</h2>
          <p className="mt-2 text-ink-500">{t("landing.plansSubtitle")}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {PLAN_CARDS.map(([code, price, name, desc]) => (
              <article key={code} className={`rounded-3xl border p-5 ${code === "pro" ? "border-teal-600 bg-navy-700 text-white" : "paper border-ink-200 dark:border-white/10"}`}>
                <p className="font-semibold">{t(name)}</p>
                <p className="mt-3 text-4xl font-bold">{price} <span className="text-sm font-medium">{t("common.sar")}</span></p>
                <p className="mt-3 text-sm leading-7 opacity-80">{t(desc)}</p>
                <ul className="mt-4 grid gap-2 text-sm">
                  <li className="flex gap-2"><Check size={16} /> {t("memo.exportPdf")}</li>
                </ul>
                <Link href="/signup" className={`mt-5 block rounded-xl px-4 py-2 text-center text-sm font-semibold ${code === "pro" ? "bg-white text-navy-700" : "bg-navy-700 text-white"}`}>{t("plans.choose")}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section id="faq" className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-3xl font-bold text-navy-700 dark:text-white">{t("landing.faqTitle")}</h2>
        <div className="mt-6 divide-y divide-ink-200 rounded-3xl border border-ink-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-navy-800">
          {FAQS.map((key) => (
            <button key={key} className="block w-full px-5 py-4 text-start" type="button" onClick={() => setOpen(key)}>
              <span className="font-semibold">{t(`landing.${key}`)}</span>
              {open === key ? <p className="mt-2 text-sm leading-7 text-ink-500">{t(`landing.a${key.slice(1)}`)}</p> : null}
            </button>
          ))}
        </div>
      </section>
      <section className="px-4 pb-14">
        <div className="mx-auto max-w-6xl rounded-3xl bg-navy-700 px-6 py-12 text-white md:px-12">
          <h2 className="text-3xl font-bold">{t("landing.ctaTitle")}</h2>
          <p className="mt-2 text-white/80">{t("landing.ctaSubtitle")}</p>
          <Link href="/signup" className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-navy-700">{t("landing.ctaPrimary")}</Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
