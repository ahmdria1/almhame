"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccountFrame } from "@/components/account-frame";
import { Button, Input } from "@/components/ui";
import { useApp } from "@/lib/providers";

export default function ReferralPage() {
  const { t, client } = useApp();
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { client.referral().then((result) => setCode(result.code)).catch(() => setCode("")); }, [client]);
  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entered = String(new FormData(event.currentTarget).get("code") || "");
    await client.claimReferral(entered);
    setNote(t("referral.ok"));
  }
  return (
    <AccountFrame title={t("referral.title")}>
      <p className="mt-4 text-sm text-ink-500">{t("referral.yours")}</p>
      <p className="mt-1 font-semibold">{code}</p>
      <form className="mt-6 grid gap-3" onSubmit={(event) => void claim(event)}>
        <Input name="code" placeholder={t("referral.claim")} required />
        <Button type="submit">{t("referral.claim")}</Button>
      </form>
      {note ? <p className="mt-3 text-sm text-teal-700">{note}</p> : null}
    </AccountFrame>
  );
}
