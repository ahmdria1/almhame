"use client";

import { Download, FileText, Lock, Scale } from "lucide-react";
import Link from "next/link";
import { LanguageMenu } from "@/components/chrome";
import { Logo } from "@/components/logo";
import { useApp } from "@/lib/providers";

const POINTS = [
  ["landing.f1Body", FileText],
  ["landing.f3Title", Scale],
  ["landing.f4Title", Download],
  ["landing.f6Title", Lock],
] as const;

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useApp();
  const name = t("app.name");
  const split = name.lastIndexOf(" ");
  const lead = split > 0 ? name.slice(0, split) : name;
  const accent = split > 0 ? name.slice(split + 1) : "";
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-2">
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="absolute end-4 top-4">
          <LanguageMenu />
        </div>
        <div className="w-full max-w-[400px]">
          <Link href="/" className="mb-6 flex items-center justify-start gap-2.5">
            <Logo size={36} />
            <span className="text-xl font-semibold text-ink-900">{t("app.name")}</span>
          </Link>
          {children}
        </div>
      </div>
      <aside className="hidden flex-col items-center justify-center gap-10 bg-navy-700 px-10 py-16 text-white lg:flex">
        <Link href="/" className="flex flex-col items-center gap-5 text-center">
          <Logo size={104} light />
          <span className="text-[32px] font-bold leading-[48px]">
            {lead}
            {accent ? <span className="mt-1 block text-teal-300">{accent}</span> : null}
          </span>
        </Link>
        <p className="max-w-lg text-center text-[32px] font-bold leading-[48px]">{t("landing.heroTitle")}</p>
        <ul className="grid gap-4">
          {POINTS.map(([key, Icon]) => (
            <li key={key} className="flex items-center justify-end gap-3 text-lg leading-8 text-ink-300">
              <span>{t(key)}</span>
              <Icon size={22} className="shrink-0 text-teal-300" />
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
