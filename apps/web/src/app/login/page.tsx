"use client";

import { ApiError } from "@elawyer/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Input } from "@/components/ui";
import { useApp } from "@/lib/providers";

export default function LoginPage() {
  const { t, client, setSession } = useApp();
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const result = await client.login({
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      });
      setSession(result.accessToken, result.user);
      router.push("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-navy-700 dark:text-white">{t("auth.loginTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">{t("auth.loginSubtitle")}</p>
      <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
        <label className="text-sm font-semibold">{t("auth.email")}<Input data-testid="login-email" name="email" type="email" required className="mt-1" /></label>
        <label className="text-sm font-semibold">{t("auth.password")}<Input data-testid="login-password" name="password" type="password" required minLength={8} className="mt-1" /></label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button data-testid="login-submit" type="submit">{t("auth.submitLogin")}</Button>
      </form>
      <p className="mt-4 text-sm text-ink-500"><Link className="font-semibold text-teal-700" href="/forgot">{t("auth.forgot")}</Link></p>
      <p className="mt-2 text-sm text-ink-500">{t("auth.noAccount")} <Link className="font-semibold text-teal-700" href="/signup">{t("nav.startFree")}</Link></p>
    </AuthShell>
  );
}
