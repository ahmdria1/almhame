import { LANGUAGE_NAMES, translate } from "@elawyer/i18n";
import { LOCALES, type Locale } from "@elawyer/types";
import Image from "next/image";
import { COPY, brandName } from "@/seo/copy";
import { authPath, pagePath, type PageRef } from "@/seo/catalog";

function href(locale: Locale, page: PageRef, hash?: string): string {
  const path = pagePath(locale, page);
  if (!hash) return path;
  return `${path}#${hash}`;
}

export function PublicHeader({ locale, page }: { locale: Locale; page: PageRef }) {
  const name = brandName(locale);
  const home = href(locale, { kind: "home" });
  const links = [
    [href(locale, { kind: "home" }, "features"), "nav.features"],
    [href(locale, { kind: "home" }, "courts"), "nav.courts"],
    [href(locale, { kind: "home" }, "how"), "nav.how"],
    [pagePath(locale, { kind: "top", id: "pricing" }), "nav.plans"],
    [pagePath(locale, { kind: "top", id: "faq" }), "nav.faq"],
  ] as const;
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-navy-700 focus:px-4 focus:py-2 focus:text-white">
        {COPY.skip[locale]}
      </a>
      <div data-testid="public-header" className="mx-auto flex h-16 max-w-6xl flex-nowrap items-center gap-3 px-4">
        <a href={home} className="flex min-w-0 items-center gap-2">
          <Image src="/brand/node-scale.svg" alt="" width={34} height={34} priority unoptimized />
          <span className="hidden truncate text-[15px] font-bold text-navy-700 sm:inline sm:max-w-[10rem] lg:max-w-none">{name}</span>
        </a>
        <nav aria-label={COPY.menu[locale]} className="hidden flex-1 items-center justify-center gap-6 text-sm font-semibold text-ink-700 lg:flex">
          {links.map(([path, key]) => (
            <a key={key} href={path} className="hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
              {label(locale, key)}
            </a>
          ))}
        </nav>
        <details className="relative lg:hidden">
          <summary aria-label={COPY.menu[locale]} className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-ink-200 text-navy-700">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </summary>
          <div className="absolute end-0 z-50 mt-2 w-56 rounded-2xl border border-ink-200 bg-white p-2 shadow-card">
            {links.map(([path, key]) => (
              <a key={key} href={path} className="block min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-navy-700">
                {label(locale, key)}
              </a>
            ))}
            <a href={authPath(locale, "/login")} className="block min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-navy-700">{label(locale, "nav.login")}</a>
            <a href={authPath(locale, "/signup")} className="mt-1 block min-h-11 rounded-xl bg-navy-700 px-3 py-2 text-center text-sm font-semibold text-white">{label(locale, "nav.startFree")}</a>
          </div>
        </details>
        <div className="ms-auto flex items-center gap-2">
          <details className="relative">
            <summary data-testid="lang-switch" className="flex min-h-11 min-w-11 cursor-pointer list-none items-center gap-1 rounded-full border border-ink-200 px-3 text-sm font-semibold text-navy-700">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9s1.3-6.2 3.8-9z" />
              </svg>
              <span className="hidden lg:inline">{COPY.language[locale]}</span>
            </summary>
            <div className="absolute end-0 z-50 mt-2 w-44 rounded-2xl border border-ink-200 bg-white p-1 shadow-card">
              {LOCALES.map((code) => (
                <a
                  key={code}
                  data-testid={`lang-${code}`}
                  href={pagePath(code, page)}
                  hrefLang={code}
                  lang={code}
                  aria-current={code === locale ? "true" : undefined}
                  className={`block rounded-xl px-3 py-2 text-sm ${code === locale ? "bg-teal-100 text-teal-700" : "text-navy-700"}`}
                >
                  {LANGUAGE_NAMES[code]}
                </a>
              ))}
            </div>
          </details>
          <a href={authPath(locale, "/login")} className="hidden min-h-12 items-center px-3 text-sm font-semibold text-navy-700 sm:inline-flex">
            {label(locale, "nav.login")}
          </a>
          <a href={authPath(locale, "/signup")} data-testid="start-free" className="hidden min-h-11 items-center whitespace-nowrap rounded-xl bg-navy-700 px-3 text-sm font-semibold text-white md:inline-flex">
            {label(locale, "nav.startFree")}
          </a>
        </div>
      </div>
    </header>
  );
}

function label(locale: Locale, key: string): string {
  return translate(locale, key);
}

export function PublicFooter({ locale }: { locale: Locale }) {
  const name = brandName(locale);
  const groups = [
    {
      title: label(locale, "footer.product"),
      links: [
        [pagePath(locale, { kind: "top", id: "pricing" }), COPY.pricing[locale]],
        [href(locale, { kind: "home" }, "features"), label(locale, "nav.features")],
        [href(locale, { kind: "home" }, "courts"), COPY.courts[locale]],
      ],
    },
    {
      title: label(locale, "footer.company"),
      links: [
        [pagePath(locale, { kind: "top", id: "about" }), COPY.about[locale]],
        [pagePath(locale, { kind: "top", id: "contact" }), COPY.contact[locale]],
        [pagePath(locale, { kind: "top", id: "search" }), COPY.search[locale]],
      ],
    },
    {
      title: label(locale, "footer.legal"),
      links: [
        [pagePath(locale, { kind: "top", id: "privacy" }), COPY.privacy[locale]],
        [pagePath(locale, { kind: "top", id: "terms" }), COPY.terms[locale]],
        [pagePath(locale, { kind: "top", id: "faq" }), COPY.faq[locale]],
      ],
    },
  ] as const;
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <a href={pagePath(locale, { kind: "home" })} className="flex items-center gap-2">
            <Image src="/brand/node-scale.svg" alt="" width={32} height={32} unoptimized />
            <span className="font-bold text-navy-700">{name}</span>
          </a>
          <p className="mt-3 text-sm leading-7 text-ink-700">{label(locale, "footer.blurb")}</p>
        </div>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="font-semibold text-navy-700">{group.title}</p>
            <ul className="mt-3 grid gap-2 text-sm text-ink-700">
              {group.links.map(([path, text]) => (
                <li key={path}>
                  <a href={path} className="hover:text-teal-700">{text}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-ink-100 py-4 text-center text-sm text-ink-700">{label(locale, "footer.rights")}</p>
    </footer>
  );
}
