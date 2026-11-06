"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminFetch } from "../lib/api";

const LINKS = [
  ["/dashboard", "نظرة عامة"],
  ["/dashboard/users", "المستخدمون"],
  ["/dashboard/plans", "الاشتراكات والباقات"],
  ["/dashboard/payments", "المدفوعات والفواتير"],
  ["/dashboard/memos", "المذكرات حسب المحكمة"],
  ["/dashboard/corpus", "قاعدة الأنظمة"],
  ["/dashboard/statutes", "إضافة الأنظمة"],
  ["/dashboard/costs", "تكلفة التشغيل"],
  ["/dashboard/operations", "العمليات"],
  ["/dashboard/settings", "الإعدادات"],
  ["/dashboard/audit", "سجل العمليات"],
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-ink-200 bg-navy-800 text-white md:border-b-0 md:border-l">
        <div className="px-4 py-5">
          <p className="text-xs text-teal-100">المحامي الإلكتروني</p>
          <h1 className="text-lg font-bold">لوحة الإدارة</h1>
        </div>
        <nav className="flex flex-wrap gap-2 px-3 pb-4 md:block md:px-3">
          {LINKS.map(([href, label]) => {
            const active = path === href;
            return (
              <Link key={href} href={href} className={`mb-1 flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 text-sm ${active ? "bg-white text-navy-800" : "text-white/90"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          className="m-3 inline-flex min-h-11 items-center text-sm text-white/80"
          onClick={() => {
            void adminFetch("/admin/logout", { method: "POST" }).finally(() => {
              window.location.href = "/";
            });
          }}
        >
          خروج
        </button>
      </aside>
      <main className="px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
