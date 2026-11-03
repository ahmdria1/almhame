import { mkdir, writeFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { AppConfig } from "./config";
import { filingEmailHtml, type FilingMailInput } from "./domain/case-alert-mail";

export async function sendAuthMail(
  config: AppConfig,
  input: { to: string; code: string; purpose: string; link: string },
): Promise<void> {
  const subject =
    input.purpose === "password_reset"
      ? "إعادة تعيين كلمة المرور"
      : input.purpose === "admin_activate"
        ? "تفعيل حساب الإدارة"
        : input.purpose === "hearing"
          ? "تذكير بموعد"
          : input.purpose === "weekly_digest"
            ? "ملخص الأسبوع"
            : input.purpose === "mfa"
              ? "رمز التحقق"
              : "تأكيد البريد";
  const text = [`الرمز: ${input.code}`, input.link, "ينتهي الرمز خلال ثلاثين دقيقة."].join("\n");
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

export async function sendFilingMail(config: AppConfig, to: string, input: FilingMailInput): Promise<void> {
  const subject = `مذكرة جديدة في القضية ${input.caseNumber}`;
  const html = filingEmailHtml(input);
  const text = [`رقم القضية: ${input.caseNumber}`, `الموضوع: ${input.title}`, `مقدمها: ${input.filer}`, input.replyUrl].join("\n");
  const outbox = config.outboxDir || path.resolve(config.storageDir, "../outbox");
  if (config.nodeEnv !== "production") {
    await mkdir(outbox, { recursive: true });
    await writeFile(path.join(outbox, `case_filing-${to.replace(/[^\w.@+-]+/g, "_")}.json`), JSON.stringify({ to, subject, html, text, at: new Date().toISOString() }, null, 2));
  }
  if (config.nodeEnv === "test" || !config.smtpHost) return;
  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  });
  await transport.sendMail({ from: config.smtpFrom, to, subject, text, html });
}
