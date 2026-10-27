"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { useApp } from "@/lib/providers";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useApp();
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4 py-10 dark:bg-navy-900">
      <div className="paper w-full max-w-md rounded-3xl border border-ink-200 p-6 shadow-card dark:border-white/10">
        <Link href="/" className="mb-4 flex items-center gap-2">
          <Logo size={32} />
          <span className="font-bold text-navy-700 dark:text-white">{t("app.name")}</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
