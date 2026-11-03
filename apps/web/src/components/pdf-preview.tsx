"use client";

import { useEffect, useState } from "react";

export function PdfPreview({ memoId }: { memoId: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api"}/memos/${memoId}/export.pdf`, { credentials: "include" })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (active && blob) setUrl(URL.createObjectURL(blob));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [memoId]);
  if (!url) return null;
  return <iframe title="pdf" src={url} className="mt-4 h-96 w-full rounded-2xl border border-ink-200" />;
}
