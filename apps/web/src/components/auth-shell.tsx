"use client";

import Link from "next/link";
import { LanguageMenu } from "@/components/chrome";
import { Logo } from "@/components/logo";
import { useApp } from "@/lib/providers";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useApp();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-navy-800 p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={40} light />
          <span className="text-lg font-bold">{t("app.name")}</span>
        </Link>
        <div>
          <p className="text-3xl font-bold leading-10">{t("auth.loginTitle")}</p>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/80">{t("landing.heroSubtitle")}</p>
        </div>
        <p className="text-sm text-white/60">{t("footer.rights")}</p>
      </aside>
      <div className="relative grid place-items-center bg-canvas px-4 py-16 dark:bg-navy-900">
        <div className="absolute end-4 top-4">
          <LanguageMenu />
        </div>
        <div className="paper w-full max-w-md rounded-3xl border border-ink-200 p-6 shadow-card dark:border-white/10">
          <Link href="/" className="mb-4 flex items-center gap-2 lg:hidden">
            <Logo size={32} />
            <span className="font-bold text-navy-700 dark:text-white">{t("app.name")}</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
