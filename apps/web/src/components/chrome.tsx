"use client";

import { LANGUAGE_NAMES } from "@elawyer/i18n";
import type { Locale } from "@elawyer/types";
import {
  Bell,
  Bookmark,
  CreditCard,
  Folder,
  Globe,
  LogOut,
  Plug,
  Search,
  Settings,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";
import { Logo } from "./logo";
import { cn } from "./ui";

export function SiteHeader({ solid = true }: { solid?: boolean }) {
  const { t, user } = useApp();
  const links = [
    ["/#features", "nav.features"],
    ["/#courts", "nav.courts"],
    ["/#how", "nav.how"],
    ["/#plans", "nav.plans"],
    ["/#faq", "nav.faq"],
  ] as const;
  return (
    <header className={cn("sticky top-0 z-40 border-b border-ink-200/80 backdrop-blur", solid ? "bg-white/90 dark:border-white/10 dark:bg-navy-900/90" : "bg-canvas/80")}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={34} />
          <span className="text-[15px] font-bold text-navy-700 dark:text-white">{t("app.name")}</span>
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-6 text-sm font-semibold text-ink-700 lg:flex dark:text-ink-200">
          {links.map(([href, key]) => (
            <Link key={key} href={href} className="hover:text-teal-600">
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LanguageMenu />
          {user ? (
            <Link href="/app" className="rounded-xl bg-navy-700 px-3 py-2 text-sm font-semibold text-white">
              {t("workspace.newChat")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden px-3 text-sm font-semibold text-navy-700 sm:inline dark:text-white">
                {t("nav.login")}
              </Link>
              <Link href="/signup" data-testid="start-free" className="rounded-xl bg-navy-700 px-3 py-2 text-sm font-semibold text-white">
                {t("nav.startFree")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function LanguageMenu() {
  const { locale, setLocale, languages, locales } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button data-testid="lang-switch" className="flex items-center gap-1 rounded-full border border-ink-200 px-3 py-1.5 text-sm font-semibold text-navy-700 dark:border-white/10 dark:text-white" onClick={() => setOpen((value) => !value)} type="button">
        <Globe size={16} />
        <span className="hidden sm:inline">{languages[locale]}</span>
      </button>
      {open ? (
        <div className="paper absolute end-0 z-50 mt-2 w-44 rounded-2xl border border-ink-200 p-1 shadow-card dark:border-white/10">
          {locales.map((code) => (
            <button
              key={code}
              data-testid={`lang-${code}`}
              className={cn("block w-full rounded-xl px-3 py-2 text-start text-sm", code === locale && "bg-teal-100 text-teal-700")}
              type="button"
              onClick={() => {
                setLocale(code as Locale);
                setOpen(false);
              }}
            >
              {LANGUAGE_NAMES[code]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AccountMenu() {
  const { t, user, logout } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<{ id: string; title: string }[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const { client } = useApp();
  useEffect(() => {
    if (!showNotes) return;
    client.notifications().then((result) => setNotes(result.items)).catch(() => setNotes([]));
  }, [showNotes, client]);
  if (!user) return null;
  const items = [
    ["/app/wallet", "nav.wallet", Wallet],
    ["/app/memos", "nav.memos", Folder],
    ["/app/saved", "nav.saved", Bookmark],
    ["/app/integrations", "nav.integrations", Plug],
    ["/app/plans", "nav.subscription", CreditCard],
    ["/app/settings", "nav.settings", Settings],
  ] as const;
  return (
    <div className="flex items-center gap-2">
      <button aria-label={t("bell.label")} className="rounded-full p-2 text-ink-500" type="button" onClick={() => setShowNotes((value) => !value)}>
        <Bell size={18} />
      </button>
      {showNotes ? (
        <div className="paper absolute end-4 top-16 z-50 w-72 rounded-2xl border border-ink-200 p-3 shadow-card dark:border-white/10">
          <p className="mb-2 text-sm font-semibold">{t("notif.title")}</p>
          {notes.length === 0 ? <p className="text-sm text-ink-500">{t("notif.empty")}</p> : notes.map((item) => <p key={item.id} className="border-t border-ink-100 py-2 text-sm">{item.title}</p>)}
        </div>
      ) : null}
      <button data-testid="account-menu" className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pe-3 ps-1 dark:border-white/10" type="button" onClick={() => setOpen((value) => !value)}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-700 text-xs font-bold text-white">{user.name.slice(0, 2)}</span>
        <span className="hidden text-sm font-semibold sm:inline">{user.name}</span>
      </button>
      {open ? (
        <div className="paper absolute end-4 top-16 z-50 w-72 rounded-2xl border border-ink-200 p-2 shadow-card dark:border-white/10">
          <div className="px-3 py-2">
            <p className="font-semibold">{user.name}</p>
            <p className="text-xs text-ink-500">{user.email}</p>
            <p className="mt-2 text-sm text-teal-700">{t("menu.memosLeft", { count: user.memoRemaining })}</p>
          </div>
          {items.map(([href, key, Icon]) => (
            <Link key={key} href={href} data-testid={`menu-${key.split(".")[1]}`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-ink-100 dark:hover:bg-white/5" onClick={() => setOpen(false)}>
              <Icon size={16} /> {t(key)}
            </Link>
          ))}
          <button
            data-testid="menu-logout"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-danger"
            type="button"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
          >
            <LogOut size={16} /> {t("nav.logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppHeader() {
  const { t } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur dark:border-white/10 dark:bg-navy-900/90">
      <Link href="/app" className="flex items-center gap-2">
        <Logo size={32} />
        <span className="hidden font-bold text-navy-700 md:inline dark:text-white">{t("app.name")}</span>
      </Link>
      <form
        className="mx-auto hidden w-full max-w-md items-center gap-2 rounded-full bg-ink-100 px-3 py-2 text-sm text-ink-500 md:flex dark:bg-white/5"
        onSubmit={(event) => {
          event.preventDefault();
          router.push(`/app/memos?q=${encodeURIComponent(q)}`);
        }}
      >
        <Search size={16} />
        <input data-testid="global-search" value={q} onChange={(event) => setQ(event.target.value)} placeholder={t("nav.searchPlaceholder")} className="w-full bg-transparent outline-none" />
      </form>
      <div className="ms-auto flex items-center gap-2">
        <LanguageMenu />
        <AccountMenu />
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useApp();
  return (
    <footer className="border-t border-ink-200 bg-white dark:border-white/10 dark:bg-navy-900">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-bold text-navy-700 dark:text-white">{t("app.name")}</span>
          </div>
          <p className="mt-3 text-sm leading-7 text-ink-500">{t("footer.blurb")}</p>
        </div>
        {[
          ["footer.product", ["nav.features", "nav.courts", "nav.plans"]],
          ["footer.company", ["footer.about", "footer.contact"]],
          ["footer.legal", ["footer.privacy", "footer.terms"]],
        ].map(([title, keys]) => (
          <div key={String(title)}>
            <p className="font-semibold text-navy-700 dark:text-white">{t(String(title))}</p>
            <div className="mt-3 grid gap-2 text-sm text-ink-500">
              {(keys as string[]).map((key) => (
                <span key={key}>{t(key)}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="border-t border-ink-100 py-4 text-center text-xs text-ink-400">{t("footer.rights")}</p>
    </footer>
  );
}
