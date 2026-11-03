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
  ["/dashboard/costs", "تكلفة التشغيل"],
  ["/dashboard/operations", "العمليات"],
  ["/dashboard/settings", "الإعدادات"],
  ["/dashboard/audit", "سجل العمليات"],
];

function Mark() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M12 20L32 8L52 20M12 20H52M32 8V54M21 54H43M12 20L4 38H20ZM52 20L44 38H60Z" stroke="#17345F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {[[32, 8, 4.5], [12, 20, 3.8], [52, 20, 3.8], [4, 38, 3.5], [20, 38, 3.5], [44, 38, 3.5], [60, 38, 3.5]].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#1F7A8C" />
      ))}
    </svg>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen bg-canvas md:grid md:grid-cols-[260px_1fr]">
      <aside className="flex flex-col border-b border-ink-200 bg-white md:min-h-screen md:border-b-0 md:border-e">
        <div className="flex items-center justify-end gap-3 px-5 py-5">
          <div className="text-end">
            <h1 className="text-sm font-semibold text-ink-900">المحامي الإلكتروني</h1>
            <p className="mt-1 inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">لوحة الإدارة</p>
          </div>
          <Mark />
        </div>
        <nav className="flex flex-wrap gap-1 px-3 pb-4 md:grid">
          {LINKS.map(([href, label]) => {
            const active = path === href;
            return (
              <Link key={href} href={href} className={`flex min-h-11 items-center justify-end rounded-xl px-3 text-sm font-semibold ${active ? "bg-teal-100 text-teal-700" : "text-ink-700 hover:bg-ink-100"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          className="m-3 mt-auto inline-flex min-h-11 items-center justify-end rounded-xl px-3 text-sm font-semibold text-ink-700"
          onClick={() => {
            void adminFetch("/admin/logout", { method: "POST" }).finally(() => {
              window.location.href = "/";
            });
          }}
        >
          خروج
        </button>
      </aside>
      <main className="px-4 py-8 md:px-10">{children}</main>
    </div>
  );
}
