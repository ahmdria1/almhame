"use client";

const KEY = "elw-analytics";

export function analyticsAllowed(pathname: string): boolean {
  if (pathname.includes("/app")) return false;
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1" && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export async function capturePage(pathname: string) {
  if (!analyticsAllowed(pathname)) return;
  const posthog = (await import("posthog-js")).default;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: false,
    persistence: "memory",
    disable_session_recording: true,
  });
  posthog.capture("$pageview", { path: pathname });
}

export function setAnalyticsChoice(allow: boolean) {
  window.localStorage.setItem(KEY, allow ? "1" : "0");
}
