"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { useApp } from "@/lib/providers";

function Result() {
  const params = useSearchParams();
  const { t } = useApp();
  const ok = params.get("status") === "paid";
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{ok ? t("pay.success") : t("pay.fail")}</h1>
        <Link href="/app/wallet" className="mt-4 inline-block text-teal-700">{t("nav.wallet")}</Link>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return <Suspense><Result /></Suspense>;
}
