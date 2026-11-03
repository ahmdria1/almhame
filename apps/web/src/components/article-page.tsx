import { translate } from "@elawyer/i18n";
import { COURTS, type Locale } from "@elawyer/types";
import { JsonLd } from "@/components/json-ld";
import { PlanCards, ServiceLinks } from "@/components/public-offers";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { DOC_IDS, authPath, pagePath, type PageRef } from "@/seo/catalog";
import { COPY, courtName, docName, pageBody, pageCopy, searchCatalog } from "@/seo/copy";
import { jsonLdFor } from "@/seo/jsonld";
import { contactEmail } from "@/seo/site";

export function ArticlePage({ locale, page }: { locale: Locale; page: Exclude<PageRef, { kind: "home" }> }) {
  const copy = pageCopy(locale, page);
  const body = pageBody(locale, page);
  const signup = authPath(locale, "/signup");
  const email = page.kind === "top" && page.id === "contact" ? contactEmail() : null;
  return (
    <div className="bg-canvas">
      <JsonLd data={jsonLdFor(locale, page)} />
      <PublicHeader locale={locale} page={page} />
      <main id="content" tabIndex={-1} className="outline-none">
        <article className="mx-auto max-w-3xl px-4 py-14">
          <nav aria-label={COPY.breadcrumbs[locale]}>
            <ol className="flex flex-wrap gap-2 text-sm text-ink-700">
              {copy.crumbs.map((crumb, index) => (
                <li key={`${crumb.path}-${index}`} className="flex gap-2">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {index === copy.crumbs.length - 1 ? (
                    <span>{crumb.name}</span>
                  ) : (
                    <a href={crumb.path} className="inline-flex min-h-11 items-center text-teal-700">{crumb.name}</a>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="mt-4 text-4xl font-bold text-navy-700">{copy.h1}</h1>
          {body.map((paragraph) => (
            <p key={paragraph} className="mt-4 text-base leading-8 text-ink-700">{paragraph}</p>
          ))}
          {page.kind === "top" && page.id === "pricing" ? <PlanList locale={locale} /> : null}
          {page.kind === "top" && page.id === "faq" ? <FaqList locale={locale} /> : null}
          {page.kind === "top" && page.id === "contact" ? (
            email ? (
              <address className="mt-6 not-italic">
                <p className="text-ink-700">{COPY.contactReady[locale]}</p>
                <a className="mt-2 inline-flex min-h-12 items-center font-semibold text-teal-700" href={`mailto:${email}`}>{email}</a>
              </address>
            ) : (
              <p className="mt-6 leading-8 text-ink-700">{COPY.contactMissing[locale]}</p>
            )
          ) : null}
          {page.kind === "doc" ? (
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-navy-700">{COPY.alsoCourts[locale]}</h2>
              <ul className="mt-4 grid gap-2">
                {COURTS.map((court) => (
                  <li key={court}>
                    <a className="inline-flex min-h-11 items-center text-teal-700" href={pagePath(locale, { kind: "court", id: court })}>{courtName(locale, court)}</a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {page.kind === "court" ? (
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-navy-700">{COPY.alsoDocs[locale]}</h2>
              <ul className="mt-4 grid gap-2">
                {DOC_IDS.map((id) => (
                  <li key={id}>
                    <a className="inline-flex min-h-11 items-center text-teal-700" href={pagePath(locale, { kind: "doc", id })}>{docName(locale, id)}</a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="mt-8">
            <a href={signup} className="inline-flex min-h-12 items-center rounded-xl bg-navy-700 px-5 font-semibold text-white">{translate(locale, "landing.ctaPrimary")}</a>
          </p>
        </article>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}

function PlanList({ locale }: { locale: Locale }) {
  const t = (key: string) => translate(locale, key);
  return (
    <div className="mt-8 grid gap-4">
      <p className="text-sm text-ink-700">{COPY.vat[locale]}</p>
      <PlanCards locale={locale} />
      <h2 className="text-xl font-semibold text-navy-700">{t("plans.payg")}</h2>
      <ServiceLinks locale={locale} />
    </div>
  );
}

function FaqList({ locale }: { locale: Locale }) {
  const t = (key: string) => translate(locale, key);
  return (
    <div className="mt-8 grid gap-6">
      {["1", "2", "3", "4"].map((item) => (
        <section key={item}>
          <h2 className="text-xl font-semibold text-navy-700">{t(`landing.q${item}`)}</h2>
          <p className="mt-2 leading-8 text-ink-700">{t(`landing.a${item}`)}</p>
        </section>
      ))}
    </div>
  );
}

export function SearchView({ locale, query }: { locale: Locale; query: string }) {
  const page = { kind: "top" as const, id: "search" as const };
  const copy = pageCopy(locale, page);
  const results = searchCatalog(locale, query);
  return (
    <div className="bg-canvas">
      <JsonLd data={jsonLdFor(locale, page)} />
      <PublicHeader locale={locale} page={page} />
      <main id="content" tabIndex={-1} className="outline-none">
        <article className="mx-auto max-w-3xl px-4 py-14">
          <h1 className="text-4xl font-bold text-navy-700">{copy.h1}</h1>
          <p className="mt-4 leading-8 text-ink-700">{copy.description}</p>
          <form className="mt-6 grid gap-3" method="get" action={pagePath(locale, page)}>
            <label htmlFor="q" className="text-sm font-semibold text-navy-700">{COPY.searchLabel[locale]}</label>
            <input id="q" name="q" type="search" defaultValue={query} className="min-h-12 rounded-xl border border-ink-200 bg-white px-4 text-ink-900" />
            <button type="submit" className="min-h-12 rounded-xl bg-navy-700 px-5 font-semibold text-white">{copy.h1}</button>
          </form>
          {query ? null : <p className="mt-6 leading-8 text-ink-700">{COPY.searchEmpty[locale]}</p>}
          {query && results.length === 0 ? <p className="mt-6 leading-8 text-ink-700">{COPY.searchNone[locale]}</p> : null}
          <ul className="mt-6 grid gap-3">
            {results.map((item) => {
              const itemCopy = pageCopy(locale, item);
              return (
                <li key={pagePath(locale, item)}>
                  <a href={pagePath(locale, item)} className="block rounded-2xl border border-ink-200 bg-white px-4 py-3">
                    <span className="font-semibold text-navy-700">{itemCopy.h1}</span>
                    <span className="mt-1 block text-sm leading-7 text-ink-700">{itemCopy.description}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </article>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
