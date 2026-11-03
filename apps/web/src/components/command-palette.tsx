"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";

const LINKS = [
  ["/app/memos", "nav.memos"],
  ["/app/cases", "cases.title"],
  ["/app/plans", "nav.plans"],
  ["/app/wallet", "nav.wallet"],
  ["/app/settings", "nav.settings"],
  ["/app/vault", "vault.title"],
  ["/app/referral", "referral.title"],
] as const;

export function CommandPalette() {
  const { t } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-navy-900/40 px-4 pt-24" onClick={() => setOpen(false)}>
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-3 shadow-card dark:bg-navy-800" onClick={(event) => event.stopPropagation()}>
        <p className="px-3 py-2 text-sm font-semibold text-ink-500">{t("palette.title")}</p>
        <ul>
          {LINKS.map(([href, key]) => (
            <li key={href}>
              <button
                type="button"
                className="w-full rounded-2xl px-3 py-2 text-start font-semibold hover:bg-ink-100 dark:hover:bg-white/10"
                onClick={() => {
                  setOpen(false);
                  router.push(href);
                }}
              >
                {t(key)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
