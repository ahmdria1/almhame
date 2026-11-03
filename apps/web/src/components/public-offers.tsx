import { memoCountPhrase, translate } from "@elawyer/i18n";
import { PLAN_CODES, PUBLISHED_PLANS, SERVICE_CODES, SERVICE_PRICES_HALALAS, type Locale, type ServiceCode } from "@elawyer/types";
import { serviceHref } from "@/lib/offers";
import { authPath } from "@/seo/catalog";
import { COPY } from "@/seo/copy";

const PLAN_KEY = { free: "plans.freeName", basic: "plans.basicName", pro: "plans.proName" } as const;
const PLAN_DESC = { free: "plans.freeDesc", basic: "plans.basicDesc", pro: "plans.proDesc" } as const;
const SERVICE_KEY: Record<ServiceCode, string> = {
  review: "plans.serviceReview",
  defense: "plans.serviceDefense",
  lawsuit: "plans.serviceClaim",
  objection: "plans.serviceObjection",
  chat_pack: "plans.serviceChatPack",
};

export function sar(halalas: number): string {
  const value = halalas / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function PlanCards({ locale }: { locale: Locale }) {
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);
  const signup = authPath(locale, "/signup");
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLAN_CODES.map((code) => {
        const plan = PUBLISHED_PLANS[code];
        const featured = code === "pro";
        return (
          <article key={code} className={`flex flex-col rounded-3xl bg-white p-6 ${featured ? "border-2 border-navy-700" : "border border-ink-200"}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-navy-700">{t(PLAN_KEY[code])}</h2>
              {featured ? <p className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-navy-700">{t("plans.popular")}</p> : null}
            </div>
            <p className="mt-3 text-sm leading-7 text-ink-700">{t(PLAN_DESC[code])}</p>
            <p className="mt-4 text-5xl font-bold leading-none text-navy-700">
              {sar(plan.priceHalalas)} <span className="text-sm font-semibold">{t("common.sar")}</span>
            </p>
            <p className="mt-3 text-sm text-ink-700">{memoCountPhrase(locale, plan.memoLimit)}</p>
            <p className="text-sm text-ink-700">{plan.chatLimit == null ? COPY.unlimited[locale] : t("plans.chats", { count: plan.chatLimit })}</p>
            <a
              data-testid={`price-${code}`}
              href={signup}
              className={`mt-5 inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-center text-sm font-semibold ${featured ? "bg-navy-700 text-white" : "border border-ink-300 bg-white text-navy-700"}`}
            >
              {t("plans.choose")} · {sar(plan.priceHalalas)} {t("common.sar")}
            </a>
          </article>
        );
      })}
    </div>
  );
}

export function ServiceLinks({ locale }: { locale: Locale }) {
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {SERVICE_CODES.map((code) => (
        <li key={code}>
          <a
            data-testid={`price-${code}`}
            href={serviceHref(locale, code)}
            className="flex min-h-12 items-center rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-navy-700"
          >
            {t(SERVICE_KEY[code], { price: sar(SERVICE_PRICES_HALALAS[code]) })}
          </a>
        </li>
      ))}
    </ul>
  );
}
