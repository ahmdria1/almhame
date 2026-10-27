"use client";

import { ApiError } from "@elawyer/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Input } from "@/components/ui";
import { useApp } from "@/lib/providers";

export default function SignupPage() {
  const { t, client } = useApp();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const email = String(form.get("email") || "");
      const result = await client.signup({
        name: String(form.get("name") || ""),
        phone: String(form.get("phone") || ""),
        email,
        password: String(form.get("password") || ""),
        consent: form.get("consent") === "on",
      });
      sessionStorage.setItem("elw_challenge", result.challengeId);
      sessionStorage.setItem("elw_email", email);
      if (result.debugCode) sessionStorage.setItem("elw_debug_code", result.debugCode);
      router.push(`/otp?challenge=${result.challengeId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-navy-700 dark:text-white">{t("auth.signupTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">{t("auth.signupSubtitle")}</p>
      <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
        <label className="text-sm font-semibold">{t("auth.name")}<Input data-testid="signup-name" name="name" required className="mt-1" /></label>
        <label className="text-sm font-semibold">{t("auth.phone")}<Input data-testid="signup-phone" name="phone" required className="mt-1" placeholder="05xxxxxxxx" /></label>
        <label className="text-sm font-semibold">{t("auth.email")}<Input data-testid="signup-email" name="email" type="email" required className="mt-1" /></label>
        <label className="text-sm font-semibold">{t("auth.password")}<Input data-testid="signup-password" name="password" type="password" required minLength={8} className="mt-1" /></label>
        <label className="flex items-start gap-2 text-sm leading-6 text-ink-700">
          <input data-testid="signup-consent" name="consent" type="checkbox" required className="mt-1" />
          {t("auth.consent")}
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button data-testid="signup-submit" type="submit" disabled={pending}>{pending ? t("common.loading") : t("auth.submitSignup")}</Button>
      </form>
      <p className="mt-4 text-sm text-ink-500">{t("auth.haveAccount")} <Link className="font-semibold text-teal-700" href="/login">{t("nav.login")}</Link></p>
    </AuthShell>
  );
}
