"use client";

import type { AssessmentView } from "@elawyer/types";
import { FormEvent, useState } from "react";
import { RangeMeter } from "@/components/range-meter";
import { Button } from "@/components/ui";
import { useApp } from "@/lib/providers";

export default function AssessPage() {
  const { t, client } = useApp();
  const [facts, setFacts] = useState("");
  const [result, setResult] = useState<AssessmentView | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await client.assess({ facts });
      setResult(response.assessment);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-700 dark:text-white">{t("assessment.title")}</h1>
      <p className="text-sm leading-7 text-ink-500">{t("assessment.subtitle")}</p>
      <form onSubmit={onSubmit} className="grid gap-3">
        <textarea value={facts} onChange={(event) => setFacts(event.target.value)} required minLength={20} className="min-h-32 w-full rounded-2xl border border-ink-200 p-4 text-base leading-7 dark:border-white/10 dark:bg-navy-900" placeholder={t("assessment.facts")} />
        <Button type="submit">{t("assessment.submit")}</Button>
      </form>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {result ? (
        <article className="paper grid gap-3 rounded-3xl border border-ink-200 p-5 dark:border-white/10">
          <p className="font-semibold">{result.caseType}</p>
          <p className="text-sm text-ink-500">{t("assessment.range", { low: result.successLow, high: result.successHigh })}</p>
          <RangeMeter low={result.successLow} high={result.successHigh} />
          <h2 className="font-semibold">{t("assessment.strengths")}</h2>
          <ul className="list-disc ps-5 text-sm leading-7">{result.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
          <h2 className="font-semibold">{t("assessment.weaknesses")}</h2>
          <ul className="list-disc ps-5 text-sm leading-7">{result.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul>
          <h2 className="font-semibold">{t("assessment.missing")}</h2>
          <ul className="list-disc ps-5 text-sm leading-7">{result.missingDocuments.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="text-sm leading-7">{result.recommendedPath}</p>
          <p className="text-sm text-ink-500">{result.disclaimer}</p>
        </article>
      ) : null}
    </main>
  );
}