"use client";

import { dirFor } from "@elawyer/i18n";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/providers";

export function PdfPreview({ memoId }: { memoId: string }) {
  const { t } = useApp();
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setFailed(false);
    setUrl("");
    void fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api"}/memos/${memoId}/export.pdf?locale=ar`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!active) return;
        if (!blob) {
          setFailed(true);
          return;
        }
        setUrl(URL.createObjectURL(blob));
      })
      .catch((err: unknown) => {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) return;
        setFailed(true);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [memoId]);
  return (
    <div dir={dirFor("ar")} className="mt-4">
      {failed ? <p className="text-sm text-danger">{t("common.error")}</p> : null}
      {!failed && !url ? <p className="text-sm text-ink-500">{t("common.loading")}</p> : null}
      {url ? <iframe title="pdf" src={url} className="h-96 w-full rounded-2xl border border-ink-200" /> : null}
    </div>
  );
}
