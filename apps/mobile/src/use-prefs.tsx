import { translate } from "@elawyer/i18n";
import type { Locale } from "@elawyer/types";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { palette, readPrefState, type PrefState, type ThemeName } from "./prefs";

let current: PrefState = readPrefState(null, null);
const listeners = new Set<() => void>();

function emit(next: PrefState) {
  current = next;
  listeners.forEach((listener) => listener());
}

async function readRaw(key: string) {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) || "";
  return (await SecureStore.getItemAsync(key)) || "";
}

async function writeRaw(key: string, value: string) {
  if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

export function usePrefs() {
  const [state, setState] = useState(current);
  useEffect(() => {
    const listener = () => setState({ ...current });
    listeners.add(listener);
    void Promise.all([readRaw("elw_locale"), readRaw("elw_theme")])
      .then(([locale, theme]) => emit(readPrefState(locale, theme)))
      .catch(() => undefined);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return {
    ...state,
    colors: palette(state.theme),
    async setLocale(locale: Locale) {
      await writeRaw("elw_locale", locale);
      emit({ ...current, locale });
    },
    async setTheme(theme: ThemeName) {
      await writeRaw("elw_theme", theme);
      emit({ ...current, theme });
    },
  };
}

export function useT() {
  const { locale } = usePrefs();
  return (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);
}
