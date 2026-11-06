"use client";

import { Suspense } from "react";
import { MemoBrowser } from "@/components/memo-browser";
import { Skeleton } from "@/components/skeleton";

export default function MemosPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8"><Skeleton className="h-24" /></div>}>
      <MemoBrowser />
    </Suspense>
  );
}
