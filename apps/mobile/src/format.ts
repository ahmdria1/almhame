import { dirFor } from "@elawyer/i18n";

export function formatSar(halalas: number): string {
  return (halalas / 100).toFixed(2);
}

export function textDirection(locale: string): "rtl" | "ltr" {
  return dirFor(locale);
}
