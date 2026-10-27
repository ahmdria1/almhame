import { translate } from "@elawyer/i18n";
import { COURTS, PAY_PER_MEMO_HALALAS, PLAN_CODES, PUBLISHED_PLANS, type Locale } from "@elawyer/types";
import { JsonLd } from "@/components/json-ld";
import { Logo } from "@/components/logo";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { DOC_IDS, authPath, pagePath } from "@/seo/catalog";
import { COPY, courtName, docName, pageCopy } from "@/seo/copy";
import { jsonLdFor } from "@/seo/jsonld";

const FEATURES = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;
const STEPS = ["s1", "s2", "s3", "s4"] as const;
const FAQ = ["1", "2", "3", "4"] as const;
const PLAN_KEY = { free: "plans.freeName", basic: "plans.basicName", pro: "plans.proName", office: "plans.officeName" } as const;
const PLAN_DESC = { free: "plans.freeDesc", basic: "plans.basicDesc", pro: "plans.proDesc", office: "plans.officeDesc" } as const;

function sar(halalas: number): string {
  const value = halalas / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function HomeView({ locale }: { locale: Locale }) {
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);
  const page = { kind: "home" as const };
  const signup = authPath(locale, "/signup");
  return (
    <div className="bg-canvas">
      <JsonLd data={jsonLdFor(locale, page)} />
      <PublicHeader locale={locale} page={page} />
      <main id="content" tabIndex={-1} className="outline-none">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <p className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-700">{t("app.platformBadge")}</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-navy-700 md:text-5xl">{pageCopy(locale, page).h1}</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-ink-700">{t("landing.heroSubtitle")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={signup} className="rounded-xl bg-navy-700 px-5 py-3 font-semibold text-white">{t("landing.ctaPrimary")}</a>
              <a href="#how" className="rounded-xl border border-ink-200 bg-white px-5 py-3 font-semibold text-navy-700">{t("landing.ctaSecondary")}</a>
            </div>
          </div>
          <div className="rounded-3xl border border-ink-200 bg-white p-4 shadow-card">
            <p className="mb-3 text-sm font-semibold text-navy-700">{t("landing.heroCase")}</p>
            <p className="rounded-2xl bg-navy-700 px-4 py-3 text-sm leading-7 text-white">{t("landing.heroUser")}</p>
            <p className="mt-3 rounded-2xl border border-ink-200 px-4 py-3 text-sm leading-7 text-ink-700">{t("landing.heroCounsel")}</p>
          </div>
        </section>
        <section id="features" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-3xl font-bold text-navy-700">{t("landing.featuresTitle")}</h2>
          <p className="mt-2 text-ink-700">{t("landing.featuresSubtitle")}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {DOC_IDS.map((id) => (
              <li key={id}>
                <a href={pagePath(locale, { kind: "doc", id })} className="inline-flex min-h-12 items-center rounded-full bg-white px-4 text-sm font-semibold text-navy-700 ring-1 ring-ink-200">
                  {docName(locale, id)}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FEATURES.map((key) => (
              <article key={key} className="rounded-3xl border border-ink-200 bg-white p-5">
                <Logo size={36} />
                <h3 className="mt-4 text-xl font-semibold text-navy-700">{t(`landing.${key}Title`)}</h3>
                <p className="mt-2 text-sm leading-7 text-ink-700">{t(`landing.${key}Body`)}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="courts" className="bg-white py-12">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-navy-700">{t("landing.courtsTitle")}</h2>
            <p className="mt-2 text-ink-700">{t("landing.courtsSubtitle")}</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {COURTS.map((court) => (
                <li key={court}>
                  <a href={pagePath(locale, { kind: "court", id: court })} className="flex min-h-12 items-center rounded-2xl border border-ink-200 bg-canvas px-4 py-4 font-semibold text-navy-700">
                    {courtName(locale, court)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section id="how" className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-3xl font-bold text-navy-700">{t("landing.howTitle")}</h2>
          <p className="mt-2 text-ink-700">{t("landing.howSubtitle")}</p>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((key, index) => (
              <li key={key} className="rounded-3xl border border-ink-200 bg-white p-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-700 text-sm font-bold text-white">{index + 1}</span>
                <h3 className="mt-4 font-semibold text-navy-700">{t(`landing.${key}Title`)}</h3>
                <p className="mt-2 text-sm leading-7 text-ink-700">{t(`landing.${key}Body`)}</p>
              </li>
            ))}
          </ol>
        </section>
        <section id="plans" className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-navy-700">{t("landing.plansTitle")}</h2>
            <p className="mt-2 text-ink-700">{t("landing.plansSubtitle")}</p>
            <p className="mt-2 text-sm text-ink-700">{COPY.vat[locale]}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {PLAN_CODES.map((code) => {
                const plan = PUBLISHED_PLANS[code];
                const featured = code === "pro";
                return (
                  <article key={code} className={`rounded-3xl border p-5 ${featured ? "border-teal-600 bg-navy-700 text-white" : "border-ink-200 bg-white"}`}>
                    <h3 className="font-semibold">{t(PLAN_KEY[code])}</h3>
                    <p className="mt-3 text-4xl font-bold">
                      {sar(plan.priceHalalas)} <span className="text-sm font-medium">{t("common.sar")}</span>
                    </p>
                    <p className={`mt-3 text-sm leading-7 ${featured ? "text-white" : "text-ink-700"}`}>{t(PLAN_DESC[code])}</p>
                    <p className={`mt-3 text-sm ${featured ? "text-white" : "text-ink-700"}`}>
                      {plan.chatLimit == null ? COPY.unlimited[locale] : t("plans.chats", { count: plan.chatLimit })}
                    </p>
                    <a href={signup} className={`mt-5 block rounded-xl px-4 py-2 text-center text-sm font-semibold ${featured ? "bg-white text-navy-700" : "bg-navy-700 text-white"}`}>
                      {t("plans.choose")}
                    </a>
                  </article>
                );
              })}
            </div>
            <p className="mt-6 text-sm text-ink-700">{t("plans.payg", { price: sar(PAY_PER_MEMO_HALALAS) })}</p>
            <p className="mt-2 text-sm font-semibold">
              <a href={pagePath(locale, { kind: "top", id: "pricing" })} className="text-teal-700">{COPY.pricing[locale]}</a>
            </p>
          </div>
        </section>
        <section id="faq" className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-3xl font-bold text-navy-700">{t("landing.faqTitle")}</h2>
          <div className="mt-6 divide-y divide-ink-200 rounded-3xl border border-ink-200 bg-white">
            {FAQ.map((item) => (
              <details key={item} className="px-5 py-4">
                <summary className="cursor-pointer font-semibold text-navy-700">
                  <h3 className="inline text-base font-semibold">{t(`landing.q${item}`)}</h3>
                </summary>
                <p className="mt-2 text-sm leading-7 text-ink-700">{t(`landing.a${item}`)}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
