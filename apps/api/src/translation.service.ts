import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { LOCALES } from "@elawyer/types";
import { Queue, Worker } from "bullmq";
import { isTranslationLocale, parseTranslation, placeholdersKept, TRANSLATION_LOCALES, translationPrompt } from "./domain/translate";
import { fail } from "./http-error";
import { Kernel } from "./kernel";

type Translator = (locale: string, text: string) => Promise<string>;

@Injectable()
export class TranslationService implements OnModuleInit, OnModuleDestroy {
  translator: Translator = (locale, text) => this.remote(locale, text);
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly kernel: Kernel) {}

  async onModuleInit() {
    if (!this.kernel.config.redisUrl || process.env.NODE_ENV === "test") return;
    try {
      const connection = { url: this.kernel.config.redisUrl, maxRetriesPerRequest: null as null };
      this.queue = new Queue("translations", { connection });
      this.worker = new Worker(
        "translations",
        async (job) => {
          await this.run(String(job.data.scope), String(job.data.sourceId));
        },
        { connection },
      );
    } catch {
      this.queue = undefined;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async save(input: { scope: string; sourceId?: string; text: string; priority?: "normal" | "urgent" }) {
    const text = input.text.trim();
    if (text.length < 1 || text.length > 8000) fail("VALIDATION", 400, "Arabic text is required");
    let sourceId = input.sourceId || "";
    if (input.scope === "notice" && !sourceId) {
      const notice = await this.kernel.prisma.adminNotice.create({
        data: { priority: input.priority === "urgent" ? "urgent" : "normal" },
      });
      sourceId = notice.id;
    }
    if (!sourceId) fail("VALIDATION", 400, "A source id is required");
    await this.kernel.prisma.localizedText.upsert({
      where: { scope_sourceId_locale: { scope: input.scope, sourceId, locale: "ar" } },
      create: { scope: input.scope, sourceId, locale: "ar", text, status: "ready" },
      update: { text, status: "ready", error: "" },
    });
    for (const locale of TRANSLATION_LOCALES) {
      const existing = await this.kernel.prisma.localizedText.findUnique({
        where: { scope_sourceId_locale: { scope: input.scope, sourceId, locale } },
      });
      if (existing?.status === "override") continue;
      await this.kernel.prisma.localizedText.upsert({
        where: { scope_sourceId_locale: { scope: input.scope, sourceId, locale } },
        create: { scope: input.scope, sourceId, locale, text: "", status: "pending" },
        update: { status: "pending", error: "", text: "" },
      });
    }
    await this.enqueue(input.scope, sourceId);
    return { sourceId, ...(await this.status(input.scope, sourceId)) };
  }

  async status(scope: string, sourceId: string) {
    const rows = await this.kernel.prisma.localizedText.findMany({ where: { scope, sourceId }, orderBy: { locale: "asc" } });
    return {
      locales: rows.map((row) => ({ locale: row.locale, status: row.status, error: row.error, text: row.status === "pending" ? "" : row.text })),
    };
  }

  async override(scope: string, sourceId: string, locale: string, text: string) {
    if (!isTranslationLocale(locale) || locale === "ar") fail("VALIDATION", 400, "Choose a target language");
    const source = await this.kernel.prisma.localizedText.findUnique({
      where: { scope_sourceId_locale: { scope, sourceId, locale: "ar" } },
    });
    if (!source) fail("NOT_FOUND", 404, "Arabic source was not found");
    const clean = text.trim();
    if (!clean || !placeholdersKept(source.text, clean)) fail("VALIDATION", 400, "The override must keep every placeholder");
    await this.kernel.prisma.localizedText.upsert({
      where: { scope_sourceId_locale: { scope, sourceId, locale } },
      create: { scope, sourceId, locale, text: clean, status: "override" },
      update: { text: clean, status: "override", error: "" },
    });
    return this.status(scope, sourceId);
  }

  async publish(scope: string, sourceId: string) {
    const rows = await this.kernel.prisma.localizedText.findMany({ where: { scope, sourceId } });
    const byLocale = new Map(rows.map((row) => [row.locale, row]));
    const blocked = LOCALES.filter((locale) => {
      const row = byLocale.get(locale);
      return !row || (row.status !== "ready" && row.status !== "override");
    });
    if (blocked.length) fail("PUBLISH_BLOCKED", 409, `Translation is not ready: ${blocked.join(", ")}`);
    if (scope !== "notice") return { published: true, sent: 0 };
    const notice = await this.kernel.prisma.adminNotice.findUnique({ where: { id: sourceId } });
    const priority = notice?.priority === "urgent" ? "urgent" : "normal";
    const users = await this.kernel.prisma.user.findMany();
    let sent = 0;
    for (const user of users) {
      const locale = (LOCALES as readonly string[]).includes(user.locale) ? user.locale : "";
      const row = locale ? byLocale.get(locale) : undefined;
      if (!row?.text) continue;
      const dek = this.kernel.dekOf(user.wrappedDataKey);
      await this.kernel.prisma.notification.create({
        data: { userId: user.id, kind: "announcement", priority, titleEnc: this.kernel.enc(dek, row.text) },
      });
      sent += 1;
    }
    await this.kernel.prisma.adminNotice.update({ where: { id: sourceId }, data: { status: "published" } });
    return { published: true, sent };
  }

  async run(scope: string, sourceId: string) {
    const source = await this.kernel.prisma.localizedText.findUnique({
      where: { scope_sourceId_locale: { scope, sourceId, locale: "ar" } },
    });
    if (!source) return;
    const rows = await this.kernel.prisma.localizedText.findMany({ where: { scope, sourceId } });
    for (const row of rows) {
      if (row.locale === "ar" || row.status === "override" || row.status === "ready") continue;
      try {
        const text = (await this.translator(row.locale, source.text)).trim();
        if (!text || !placeholdersKept(source.text, text)) {
          await this.mark(row.id, "failed", "", "placeholders");
          continue;
        }
        await this.mark(row.id, "ready", text, "");
      } catch (error) {
        const message = error instanceof Error ? error.message : "translation failed";
        await this.mark(row.id, "failed", "", message.slice(0, 180));
      }
    }
  }

  private async mark(id: string, status: string, text: string, error: string) {
    await this.kernel.prisma.localizedText.update({ where: { id }, data: { status, ...(text ? { text } : {}), error } });
  }

  private async enqueue(scope: string, sourceId: string) {
    if (!this.queue) {
      await this.run(scope, sourceId);
      return;
    }
    await this.queue.add("translate", { scope, sourceId }, { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 50 });
  }

  private async remote(locale: string, text: string): Promise<string> {
    const cfg = this.kernel.config;
    if (cfg.llmProvider !== "remote" || !cfg.modelBaseUrl || !cfg.modelApiKey) {
      throw new Error("model unavailable");
    }
    const response = await fetch(`${cfg.modelBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.modelApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.modelName,
        temperature: 0,
        messages: [
          { role: "system", content: translationPrompt(locale, text) },
          { role: "user", content: text },
        ],
      }),
    });
    if (!response.ok) throw new Error("model failed");
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = parseTranslation(payload.choices?.[0]?.message?.content || "");
    if (!parsed) throw new Error("empty translation");
    return parsed;
  }
}
