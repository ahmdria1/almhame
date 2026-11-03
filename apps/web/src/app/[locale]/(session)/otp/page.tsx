"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Input } from "@/components/ui";
import { userFacingError } from "@/lib/errors";
import { useApp } from "@/lib/providers";

function OtpForm() {
  const { t, client, setSession } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const challengeId = params.get("challenge") || "";
  const email = params.get("email") || "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") || "");
    setError("");
    try {
      const result = await client.verify({ challengeId, code });
      setSession(result.user);
      router.push("/app");
    } catch (err) {
      setError(userFacingError(err, t));
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-navy-700 dark:text-white">{t("auth.otpTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">{t("auth.otpSubtitle", { target: email })}</p>
      <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
        <Input data-testid="otp-input" name="code" inputMode="numeric" maxLength={6} required placeholder="••••••" />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button data-testid="otp-submit" type="submit">{t("auth.otpVerify")}</Button>
      </form>
      <button
        type="button"
        className="mt-4 text-sm font-semibold text-teal-700"
        onClick={async () => {
          if (!email) return;
          try {
            const result = await client.resend({ email });
            router.replace(`/otp?challenge=${result.challengeId}&email=${encodeURIComponent(email)}`);
          } catch (err) {
            setError(userFacingError(err, t));
          }
        }}
      >
        {t("auth.resend")}
      </button>
      <p className="mt-2 text-center"><Link className="inline-flex min-h-11 items-center font-semibold text-brand-500" href="/signup">{t("auth.signupTitle")}</Link></p>
    </AuthShell>
  );
}

export default function OtpPage() {
  return (
    <Suspense>
      <OtpForm />
    </Suspense>
  );
}
