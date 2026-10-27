import { mkdir, writeFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { AppConfig } from "./config";

export async function sendAuthMail(
  config: AppConfig,
  input: { to: string; code: string; purpose: string; link: string },
): Promise<void> {
  const subject =
    input.purpose === "password_reset"
      ? "إعادة تعيين كلمة المرور"
      : input.purpose === "admin_activate"
        ? "تفعيل حساب الإدارة"
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
