"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";

type Filing = { id: string; title: string; filer: string; filedAt: string; responseDeadline: string | null };
type Detail = {
  connected: boolean;
  case: { id: string; caseNumber: string; court: string; role: string; status: string; filings: Filing[] };
};

export default function TrackedCasePage() {
  const params = useParams<{ id: string }>();
  const { t, client } = useApp();
  const [data, setData] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    client.trackedCase(id).then(setData).catch(() => setMissing(true));
  }, [params.id]);

  if (missing) return <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-ink-500">{t("errors.busy")}</main>;
  if (!data) return <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-ink-500">{t("common.loading")}</main>;
  const item = data.case;
  const reply = `/app?court=${encodeURIComponent(item.court)}&memo=reply&caseNumber=${encodeURIComponent(item.caseNumber)}`;
  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
      <Link href="/app/tracked" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-700">{t("track.back")}</Link>
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{item.caseNumber}</h1>
      {data.connected ? null : <p data-testid="tracked-notice" className="rounded-2xl bg-teal-100 px-4 py-3 text-sm leading-7 text-teal-700">{t("track.notConnected")}</p>}
      <p className="text-sm text-ink-500">{t(`courts.${item.court}`)} · {item.role === "defendant" ? t("track.defendant") : t("track.plaintiff")}</p>
      <Link data-testid="draft-reply" href={reply} className="inline-flex min-h-11 w-fit items-center rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white">{t("track.draftReply")}</Link>
      <h2 className="font-semibold">{t("track.filings")}</h2>
      {item.filings.length === 0 ? <p data-testid="tracked-empty-filings" className="text-sm text-ink-500">{t("track.noFilings")}</p> : (
        <ol className="grid gap-3">
          {item.filings.map((filing) => (
            <li key={filing.id} className="rounded-2xl border border-ink-200 bg-white p-4 dark:border-white/10 dark:bg-navy-800">
              <p className="font-semibold">{filing.title}</p>
              <p className="mt-1 text-sm">{t("track.filer")}: {filing.filer}</p>
              <p className="text-sm">{t("track.filedAt")}: {filing.filedAt.slice(0, 10)}</p>
              {filing.responseDeadline ? <p className="text-sm">{t("track.deadline")}: {filing.responseDeadline.slice(0, 10)}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
