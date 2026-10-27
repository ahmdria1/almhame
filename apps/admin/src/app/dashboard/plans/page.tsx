"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminFetch } from "../../../lib/api";

type Plan = { code: string; priceHalalas: number; memoLimit: number; chatLimit: number | null };

const NAMES: Record<string, string> = { free: "مجانية", basic: "أساسية", pro: "احترافية", office: "مكتب" };

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    adminFetch<Plan[]>("/admin/plans").then(setPlans).catch((err) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>, code: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const chat = String(form.get("chatLimit") || "");
    setError("");
    try {
      await adminFetch(`/admin/plans/${code}`, {
        method: "PATCH",
        body: JSON.stringify({
          priceHalalas: Number(form.get("priceHalalas")),
          memoLimit: Number(form.get("memoLimit")),
          chatLimit: chat === "" ? null : Number(chat),
        }),
      });
      setNote("حُفظت الباقة");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الحفظ");
    }
  }

  return (
    <section>
      <h2 className="text-2xl font-bold text-navy-700">الاشتراكات والباقات</h2>
      <p className="mt-1 text-sm text-ink-500">عدّل السعر الشهري بالهللة وحصص المذكرات والمحادثات. اترك حد المحادثات فارغًا إذا كان غير محدود.</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {note ? <p className="mt-3 text-sm text-teal-600">{note}</p> : null}
      <div className="mt-4 grid gap-4">
        {plans.map((plan) => (
          <form key={plan.code} className="grid gap-2 rounded-2xl border border-ink-200 bg-white p-4 md:grid-cols-4" onSubmit={(event) => onSubmit(event, plan.code)}>
            <p className="font-bold md:col-span-4">{NAMES[plan.code] || plan.code}</p>
            <label className="text-sm">السعر (هللة)<input name="priceHalalas" defaultValue={plan.priceHalalas} className="mt-1 h-11 w-full rounded-xl border px-3" /></label>
            <label className="text-sm">حد المذكرات<input name="memoLimit" defaultValue={plan.memoLimit} className="mt-1 h-11 w-full rounded-xl border px-3" /></label>
            <label className="text-sm">حد المحادثات<input name="chatLimit" defaultValue={plan.chatLimit ?? ""} className="mt-1 h-11 w-full rounded-xl border px-3" /></label>
            <button className="h-11 self-end rounded-xl bg-navy-700 px-4 text-white" type="submit">حفظ</button>
          </form>
        ))}
      </div>
    </section>
  );
}
