"use client";

import { ApiError } from "@elawyer/api-client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Input } from "@/components/ui";
import { useApp } from "@/lib/providers";

function OtpForm() {
  const { t, client, setSession } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [debugCode, setDebugCode] = useState("");
  const challengeId = params.get("challenge") || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("elw_challenge") : "") || "";
  useEffect(() => {
    setDebugCode(sessionStorage.getItem("elw_debug_code") || "");
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") || "");
    setError("");
    try {
      const result = await client.verify({ challengeId, code });
      setSession(result.accessToken, result.user);
      router.push("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-navy-700 dark:text-white">{t("auth.otpTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">{t("auth.otpSubtitle", { target: "" })}</p>
      {debugCode ? <p className="mt-3 rounded-xl bg-teal-100 px-3 py-2 text-sm font-semibold text-teal-700">{debugCode}</p> : null}
      <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
        <Input data-testid="otp-input" name="code" inputMode="numeric" maxLength={6} required placeholder="••••••" />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button data-testid="otp-submit" type="submit">{t("auth.otpVerify")}</Button>
      </form>
      <button
        type="button"
        className="mt-4 text-sm font-semibold text-teal-700"
        onClick={async () => {
          const email = sessionStorage.getItem("elw_email") || "";
          if (!email) return;
          try {
            const result = await client.resend({ email });
            sessionStorage.setItem("elw_challenge", result.challengeId);
            if (result.debugCode) setDebugCode(result.debugCode);
            router.replace(`/otp?challenge=${result.challengeId}`);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : t("common.error"));
          }
        }}
      >
        {t("auth.resend")}
      </button>
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
