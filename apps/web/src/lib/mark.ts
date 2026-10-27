import { RELEASE_MARK, RELEASE_OWNER } from "@elawyer/types";

export function installReleaseMark() {
  const stamp = process.env.NEXT_PUBLIC_BUILD_STAMP || "dev";
  const value = `${RELEASE_OWNER}|${RELEASE_MARK}|${stamp}`;
  Object.defineProperty(globalThis, "__elwMark", { value, enumerable: false, configurable: true });
  return value;
}
