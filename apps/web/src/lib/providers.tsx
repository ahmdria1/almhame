"use client";

import { ElawyerClient } from "@elawyer/api-client";
import { dirFor, isLocale, LANGUAGE_NAMES, translate } from "@elawyer/i18n";
import { LOCALES, type Locale, type SessionUser } from "@elawyer/types";
import * as Sentry from "@sentry/browser";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { installReleaseMark } from "./mark";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api";

type AppContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  client: ElawyerClient;
  user: SessionUser | null;
  ready: boolean;
  setSession: (user: SessionUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  languages: typeof LANGUAGE_NAMES;
  locales: typeof LOCALES;
};

const AppContext = createContext<AppContextValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const client = useMemo(() => new ElawyerClient({ baseUrl: API, credentials: "include" }), []);

  useEffect(() => {
    installReleaseMark();
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        sendDefaultPii: false,
        beforeSend(event) {
          if (event.request) {
            delete event.request.data;
            delete event.request.cookies;
            delete event.request.headers;
          }
          return event;
        },
      });
    }
    const savedLocale = localStorage.getItem("elw_locale");
    const savedTheme = localStorage.getItem("elw_theme");
    if (isLocale(savedLocale || "")) applyLocale(savedLocale as Locale, setLocaleState);
    if (savedTheme === "dark" || savedTheme === "light") applyTheme(savedTheme, setThemeState);
    client
      .me()
      .then((result) => setUser(result.user))
      .catch(async () => {
        try {
          const result = await client.refresh();
          setUser(result.user);
        } catch {
          setUser(null);
        }
      })
      .finally(() => setReady(true));
  }, [client]);

  const value: AppContextValue = {
    locale,
    setLocale: (next) => {
      localStorage.setItem("elw_locale", next);
      applyLocale(next, setLocaleState);
    },
    theme,
    setTheme: (next) => {
      localStorage.setItem("elw_theme", next);
      applyTheme(next, setThemeState);
      if (user) void client.updateMe({ theme: next }).then((result) => setUser(result.user)).catch(() => undefined);
    },
    t: (key, vars) => translate(locale, key, vars),
    client,
    user,
    ready,
    setSession: (nextUser) => {
      setUser(nextUser);
    },
    logout: async () => {
      await client.logout().catch(() => undefined);
      setUser(null);
    },
    refreshUser: async () => {
      const result = await client.me();
      setUser(result.user);
    },
    languages: LANGUAGE_NAMES,
    locales: LOCALES,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function applyLocale(locale: Locale, setLocale: (locale: Locale) => void) {
  setLocale(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = dirFor(locale);
}

function applyTheme(theme: "light" | "dark", setTheme: (theme: "light" | "dark") => void) {
  setTheme(theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("missing providers");
  return value;
}
