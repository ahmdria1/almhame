"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import { userFacingError } from "@/lib/errors";
import { useApp } from "@/lib/providers";

export default function ReferralPage() {
  const { t, client } = useApp();
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setFailed(false);
    client.referral().then((result) => setCode(result.code)).catch(() => {
      setCode(null);
      setFailed(true);
    });
  }, [client, attempt]);
  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entered = String(new FormData(event.currentTarget).get("code") || "");
    try {
      await client.claimReferral(entered);
      setNote(t("referral.ok"));
    } catch (err) {
      setNote(userFacingError(err, t));
    }
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("referral.title")}</h1>
      <p className="mt-4 text-sm text-ink-500">{t("referral.yours")}</p>
      {failed ? (
        <div className="mt-2">
          <p className="text-ink-700">{t("common.error")}</p>
          <button type="button" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white" onClick={() => setAttempt((value) => value + 1)}>{t("common.retry")}</button>
        </div>
      ) : <p className="mt-1 font-semibold">{code || t("common.loading")}</p>}
      <form className="mt-6 grid gap-3" onSubmit={(event) => void claim(event)}>
        <Input name="code" placeholder={t("referral.claim")} required />
        <Button type="submit">{t("referral.claim")}</Button>
      </form>
      {note ? <p className="mt-3 text-sm text-teal-700">{note}</p> : null}
    </main>
  );
}
