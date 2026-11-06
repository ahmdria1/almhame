import { mkdir, writeFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { isLocale, translate } from "@elawyer/i18n";
import { AppConfig } from "./config";

const SUBJECT_KEY: Record<string, string> = {
  password_reset: "mail.resetSubject",
  admin_activate: "mail.activateSubject",
  hearing: "mail.hearingSubject",
  weekly_digest: "mail.digestSubject",
  mfa: "mail.mfaSubject",
};

export function mailLocale(value: string | null | undefined): string {
  return value && isLocale(value) ? value : "ar";
}

export async function sendAuthMail(
  config: AppConfig,
  input: {
    to: string;
    code: string;
    purpose: string;
    link: string;
    locale?: string;
    memos?: number;
    hearings?: number;
  },
): Promise<void> {
  const locale = mailLocale(input.locale);
  const subject = translate(locale, SUBJECT_KEY[input.purpose] || "mail.verifySubject");
  const lines: string[] = [];
  if (input.purpose === "hearing") lines.push(translate(locale, "mail.hearingBody"));
  else if (input.purpose === "weekly_digest") {
    lines.push(translate(locale, "mail.digestBody", { memos: input.memos ?? 0, hearings: input.hearings ?? 0 }));
  } else {
    if (input.code) lines.push(translate(locale, "mail.codeLine", { code: input.code }));
    if (input.link) lines.push(input.link);
    if (input.code) lines.push(translate(locale, "mail.expires"));
  }
  const text = lines.join("\n");
  const outbox = config.outboxDir || path.resolve(config.storageDir, "../outbox");
  if (config.nodeEnv !== "production") {
    await mkdir(outbox, { recursive: true });
    await writeFile(
      path.join(outbox, `${input.purpose}-${input.to.replace(/[^\w.@+-]+/g, "_")}.json`),
      JSON.stringify({ ...input, at: new Date().toISOString() }, null, 2),
    );
  }
  if (config.nodeEnv === "test" || !config.smtpHost) return;
  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  });
  await transport.sendMail({ from: config.smtpFrom, to: input.to, subject, text });
}
