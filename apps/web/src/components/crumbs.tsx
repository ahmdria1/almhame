"use client";

import Link from "next/link";
import { useApp } from "@/lib/providers";

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  const { t } = useApp();
  return (
    <nav aria-label={t("nav.home")} className="mb-3 text-sm text-ink-500">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link href={item.href} className="font-semibold text-teal-700">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink-700 dark:text-white">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
