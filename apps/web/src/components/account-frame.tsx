"use client";

import { Archive, Bookmark, Briefcase, CreditCard, Folder, House, Lock, Plug, Settings, Share2, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/providers";
import { cn } from "./ui";

const LINKS = [
  ["/app", "nav.home", House],
  ["/app/memos", "nav.memos", Folder],
  ["/app/cases", "cases.title", Briefcase],
  ["/app/saved", "nav.saved", Bookmark],
  ["/app/vault", "vault.title", Archive],
  ["/app/wallet", "nav.wallet", Wallet],
  ["/app/plans", "nav.subscription", CreditCard],
  ["/app/integrations", "nav.integrations", Plug],
  ["/app/referral", "referral.title", Share2],
  ["/app/settings", "nav.settings", Settings],
] as const;

export function AccountFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { t } = useApp();
  const path = usePathname();
  return (
    <div className="lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
      <aside className="border-b border-ink-200 bg-white p-5 lg:min-h-[calc(100vh-5rem)] lg:border-b-0 lg:border-s dark:border-white/10 dark:bg-navy-900">
        <p className="px-3 text-sm text-ink-500">{t("nav.account")}</p>
        <nav className="mt-2 flex gap-2 overflow-x-auto lg:grid lg:gap-1.5">
          {LINKS.map(([href, key, Icon]) => {
            const normalized = path.replace(/^\/(en|ur|hi|pa|si|bn|ne|fil|tr|am)(?=\/)/, "");
            const active = href === "/app" ? normalized === "/app" : normalized === href || normalized.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-11 shrink-0 items-center justify-end gap-3 rounded-[10px] px-3 text-sm font-semibold",
                  active ? "bg-teal-100 text-teal-700" : "text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-white/5",
                )}
              >
                <span className="flex-1 text-start">{t(key)}</span>
                <Icon size={20} />
              </Link>
            );
          })}
        </nav>
        <p className="mt-8 hidden items-center gap-1.5 px-3 text-sm leading-6 text-ink-500 lg:flex">
          <Lock size={16} className="shrink-0 text-teal-600" />
          <span>{t("landing.f6Title")}</span>
        </p>
      </aside>
      <div className="px-4 py-8 md:px-10 md:py-10">
        <h1 className="text-[32px] font-bold leading-[48px] text-ink-900 dark:text-white">{title}</h1>
        {subtitle ? <p className="mt-1 text-base leading-7 text-ink-700 dark:text-ink-300">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
