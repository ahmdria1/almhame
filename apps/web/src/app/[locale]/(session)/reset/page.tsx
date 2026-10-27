"use client";

import { ApiError } from "@elawyer/api-client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Input } from "@/components/ui";
import { useApp } from "@/lib/providers";

function ResetForm() {
  const { t, client } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const challengeId = params.get("challenge") || "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      await client.resetPassword({
        challengeId,
        code: String(form.get("code") || ""),
        password: String(form.get("password") || ""),
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-navy-700 dark:text-white">{t("auth.resetTitle")}</h1>
      <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
        <Input data-testid="reset-code" name="code" inputMode="numeric" maxLength={6} required placeholder="••••••" />
        <Input data-testid="reset-password" name="password" type="password" required minLength={8} />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit">{t("auth.resetSubmit")}</Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
