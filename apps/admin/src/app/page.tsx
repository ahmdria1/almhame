"use client";

import { FormEvent, useState } from "react";
import { adminFetch, rememberCsrf } from "../lib/api";

export default function AdminLogin() {
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await adminFetch<{ csrfToken?: string }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      rememberCsrf(data.csrfToken || "");
      window.location.href = "./dashboard";
    } catch {
      setError("تعذر الدخول");
    }
  }
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-3xl border border-ink-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-teal-600">الإدارة</p>
        <h1 className="mt-1 text-2xl font-bold text-navy-700">دخول الإدارة</h1>
        <input data-testid="admin-email" name="email" className="mt-4 h-12 w-full rounded-xl border px-3" placeholder="البريد" />
        <input data-testid="admin-password" name="password" type="password" className="mt-3 h-12 w-full rounded-xl border px-3" placeholder="كلمة المرور" />
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <button className="mt-4 h-12 w-full rounded-xl bg-navy-700 font-semibold text-white" type="submit">دخول</button>
        <p className="mt-3 text-xs text-ink-500">أول مسؤول يُنشأ بأمر لمرة واحدة، ثم يُفعَّل من رابط البريد. هذه اللوحة لا تعرض محتوى القضايا.</p>
      </form>
    </main>
  );
}
