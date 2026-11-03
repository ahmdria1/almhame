"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Lock } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Input } from "@/components/ui";
import { userFacingError } from "@/lib/errors";
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
      setSession(result.user);
      router.push("/app");
    } catch (err) {
      setError(userFacingError(err, t));
    }
  }

  return (
    <AuthShell>
      <h1 className="text-[32px] font-bold leading-[48px] text-ink-900 dark:text-white">{t("auth.loginTitle")}</h1>
      <p className="mt-1 text-base leading-7 text-ink-700 dark:text-ink-300">{t("auth.loginSubtitle")}</p>
      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <label className="text-sm font-semibold text-ink-900 dark:text-white">{t("auth.email")}<Input data-testid="login-email" name="email" type="email" required className="mt-1.5" /></label>
        <label className="text-sm font-semibold text-ink-900 dark:text-white">{t("auth.password")}<Input data-testid="login-password" name="password" type="password" required minLength={8} className="mt-1.5" /></label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button data-testid="login-submit" type="submit" className="h-14 rounded-[14px] text-xl">{t("auth.submitLogin")}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-700"><Link className="inline-flex min-h-11 items-center font-semibold text-brand-500" href="/forgot">{t("auth.forgot")}</Link></p>
      <p className="mt-1 text-center text-base text-ink-700">{t("auth.noAccount")} <Link className="inline-flex min-h-11 items-center font-semibold text-brand-500" href="/signup">{t("nav.startFree")}</Link></p>
      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-500"><Lock size={16} className="text-teal-600" />{t("landing.f6Title")}</p>
    </AuthShell>
  );
}
