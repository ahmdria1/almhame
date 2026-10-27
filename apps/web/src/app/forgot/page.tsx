"use client";

import { ApiError } from "@elawyer/api-client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Input } from "@/components/ui";
import { useApp } from "@/lib/providers";

export default function ForgotPage() {
  const { t, client } = useApp();
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "");
    setError("");
    try {
      const result = await client.forgot({ email });
      if (result.challengeId) {
        sessionStorage.setItem("elw_challenge", result.challengeId);
        if (result.debugCode) sessionStorage.setItem("elw_debug_code", result.debugCode);
        router.push(`/reset?challenge=${result.challengeId}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-navy-700 dark:text-white">{t("auth.forgot")}</h1>
      <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
        <label className="text-sm font-semibold">{t("auth.email")}<Input data-testid="forgot-email" name="email" type="email" required className="mt-1" /></label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit">{t("auth.resend")}</Button>
      </form>
    </AuthShell>
  );
}
