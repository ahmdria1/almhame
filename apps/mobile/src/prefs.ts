import { isLocale } from "@elawyer/i18n";
import type { Locale } from "@elawyer/types";

export type ThemeName = "light" | "dark";

export type PrefState = {
  locale: Locale;
  theme: ThemeName;
};

export function readPrefState(rawLocale: string | null, rawTheme: string | null): PrefState {
  return {
    locale: rawLocale && isLocale(rawLocale) ? rawLocale : "ar",
    theme: rawTheme === "dark" ? "dark" : "light",
  };
}

export type Palette = {
  canvas: string;
  card: string;
  ink: string;
  muted: string;
  link: string;
  button: string;
  buttonText: string;
};

export function palette(theme: ThemeName): Palette {
  if (theme === "dark") {
    return {
      canvas: "#0B1E3B",
      card: "#163A63",
      ink: "#F6F8FB",
      muted: "#A9C3DC",
      link: "#7FD4CB",
      button: "#0F6B72",
      buttonText: "#F6F8FB",
    };
  }
  return {
    canvas: "#F6F8FB",
    card: "#FFFFFF",
    ink: "#0A1424",
    muted: "#5B6B82",
    link: "#0F6B72",
    button: "#0B1E3B",
    buttonText: "#F6F8FB",
  };
}
