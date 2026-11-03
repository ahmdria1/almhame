import { ApiError } from "@elawyer/api-client";

export function userFacingError(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    if (err.code === "DRAFT_RETRY") return t("workspace.draftRetry");
    if (err.status === 401 || err.code === "UNAUTHENTICATED" || /unauthorized/i.test(err.message)) return t("auth.failed");
    if (/^[\u0000-\u007f]*$/.test(err.message)) return t("common.error");
    if (err.message) return err.message;
  }
  return t("common.error");
}
