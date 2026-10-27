"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api";

function ActivateForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    const response = await fetch(`${API}/admin/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId: params.get("challenge") || form.get("challengeId"),
        code: form.get("code"),
        password: form.get("password"),
      }),
    });
    if (!response.ok) {
      setError("تعذر التفعيل. تحقق من الرمز.");
      return;
    }
    setDone(true);
  }
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-3xl border border-ink-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-navy-700">تفعيل الإدارة</h1>
        <p className="mt-1 text-sm text-ink-500">أدخل الرمز المرسل إلى البريد، ثم اختر كلمة المرور.</p>
        <input name="challengeId" defaultValue={params.get("challenge") || ""} className="mt-4 h-12 w-full rounded-xl border px-3" placeholder="معرّف الطلب" />
        <input name="code" required maxLength={6} className="mt-3 h-12 w-full rounded-xl border px-3" placeholder="الرمز" />
        <input name="password" type="password" required minLength={8} className="mt-3 h-12 w-full rounded-xl border px-3" placeholder="كلمة المرور" />
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        {done ? <p className="mt-2 text-sm text-teal-600">تم التفعيل. يمكنك الدخول الآن.</p> : null}
        <button className="mt-4 h-12 w-full rounded-xl bg-navy-700 font-semibold text-white" type="submit">تفعيل</button>
      </form>
    </main>
  );
}

export default function ActivatePage() {
  return <Suspense><ActivateForm /></Suspense>;
}
