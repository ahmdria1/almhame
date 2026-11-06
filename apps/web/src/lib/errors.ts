import { ApiError } from "@elawyer/api-client";
import { uploadErrorKey } from "@elawyer/i18n";

const CODE_KEY: Record<string, string> = {
  DRAFT_RETRY: "workspace.draftRetry",
  QUOTA_MEMOS: "quota.title",
  QUOTA_CHATS: "quota.title",
  CONSENT_REQUIRED: "auth.consent",
  EMAIL_UNVERIFIED: "auth.otpTitle",
  RATE_LIMIT: "upload.rate",
  BUSY: "errors.busy",
  UNAUTHENTICATED: "auth.failed",
};

export function userFacingError(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    const uploadKey = uploadErrorKey(err.code);
    if (uploadKey) return t(uploadKey);
    const mapped = CODE_KEY[err.code];
    if (mapped) return t(mapped);
    if (err.status === 401 || /unauthorized/i.test(err.message)) return t("auth.failed");
    if (err.message && !/^[\u0000-\u007f]*$/.test(err.message)) return err.message;
  }
  return t("common.error");
}
