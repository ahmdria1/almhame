"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppHeader } from "@/components/chrome";
import { useApp } from "@/lib/providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, user, t } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (!ready || !user) return <div className="grid min-h-screen place-items-center text-ink-500">{t("common.loading")}</div>;
  return (
    <div className="min-h-screen bg-canvas dark:bg-navy-900">
      <AppHeader />
      {children}
    </div>
  );
}
