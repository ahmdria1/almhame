"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui";
import { useApp } from "@/lib/providers";

function Sandbox() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const sig = params.get("sig") || "";
  const { t, client } = useApp();
  const [status, setStatus] = useState("");

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 dark:bg-navy-900">
      <div className="paper w-full max-w-md rounded-3xl border border-ink-200 p-6 shadow-card dark:border-white/10">
        <p className="text-sm font-semibold text-teal-700">{t("pay.title")}</p>
        <h1 className="mt-2 text-2xl font-bold text-navy-700 dark:text-white">{t("pay.sandboxNote")}</h1>
        <p className="mt-2 text-sm text-ink-500">{id}</p>
        <Button data-testid="sandbox-confirm" className="mt-6 w-full" type="button" onClick={async () => {
          setStatus(t("pay.processing"));
          const result = await client.confirmPayment({ intentId: id, sig });
          setStatus(result.status === "paid" ? t("pay.success") : t("pay.fail"));
          if (result.status === "paid") window.location.href = "/app/wallet";
        }}>{t("pay.confirm")}</Button>
        {status ? <p className="mt-3 text-sm">{status}</p> : null}
      </div>
    </main>
  );
}

export default function SandboxPage() {
  return <Suspense><Sandbox /></Suspense>;
}
