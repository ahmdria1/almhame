import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { COURTS } from "@elawyer/types";
import { Queue, Worker } from "bullmq";
import { smsProviderFor } from "./domain/sms-provider";
import { canonicalFiling, caseKey, NajizCaseSource, parseFiling, sourceHash, type CourtFilingNotice } from "./domain/najiz";
import { fail } from "./http-error";
import { Kernel } from "./kernel";
import { sendFilingMail } from "./mail";

const ROLES = new Set(["plaintiff", "defendant"]);

@Injectable()
export class CaseAlertService implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue;
  private worker?: Worker;
  private readonly source: NajizCaseSource;

  constructor(private readonly kernel: Kernel) {
    this.source = new NajizCaseSource(kernel.config);
  }

  get connected(): boolean {
    return this.source.connected;
  }

  async onModuleInit() {
    if (!this.kernel.config.redisUrl || process.env.NODE_ENV === "test" || !this.connected) return;
    try {
      const connection = { url: this.kernel.config.redisUrl, maxRetriesPerRequest: null as null };
      this.queue = new Queue("case-alerts", { connection });
      await this.queue.add("poll", {}, { repeat: { every: 15 * 60 * 1000 }, jobId: "najiz-poll", removeOnComplete: 20 });
      this.worker = new Worker("case-alerts", async () => { await this.pollOnce(); }, { connection });
    } catch {
      this.queue = undefined;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async list(userId: string, dek: Buffer) {
    const rows = await this.kernel.prisma.trackedCase.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { _count: { select: { filings: true } } } });
    return {
      connected: this.connected,
      cases: rows.map((row) => ({
        id: row.id,
        caseNumber: this.kernel.dec(dek, row.caseNumberEnc),
        court: row.court,
        role: row.role,
        status: this.connected ? row.status : "pending_link",
        filings: row._count.filings,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async add(userId: string, dek: Buffer, input: { caseNumber?: string; court?: string; role?: string }) {
    const caseNumber = (input.caseNumber || "").trim();
    const court = (input.court || "").trim();
    const role = (input.role || "").trim();
    if (caseNumber.length < 3 || caseNumber.length > 40) fail("VALIDATION", 400, "Case number is required");
    if (!COURTS.includes(court as (typeof COURTS)[number])) fail("VALIDATION", 400, "Court is not recognized");
    if (!ROLES.has(role)) fail("VALIDATION", 400, "Role is not recognized");
    const key = caseKey(court, caseNumber);
    const row = await this.kernel.prisma.trackedCase.upsert({
      where: { userId_caseKey: { userId, caseKey: key } },
      update: { role },
      create: { userId, caseKey: key, caseNumberEnc: this.kernel.enc(dek, caseNumber), court, role, status: "pending_link" },
    });
    return { case: { id: row.id, caseNumber, court, role, status: this.connected ? row.status : "pending_link", connected: this.connected } };
  }

  async detail(userId: string, dek: Buffer, id: string) {
    const row = await this.kernel.prisma.trackedCase.findFirst({
      where: { id, userId },
      include: { filings: { orderBy: { filedAt: "desc" } } },
    });
    if (!row) fail("NOT_FOUND", 404, "Case was not found");
    return {
      connected: this.connected,
      case: {
        id: row.id,
        caseNumber: this.kernel.dec(dek, row.caseNumberEnc),
        court: row.court,
        role: row.role,
        status: this.connected ? row.status : "pending_link",
        filings: row.filings.map((filing) => ({
          id: filing.id,
          externalId: filing.externalId,
          title: this.kernel.dec(dek, filing.titleEnc),
          filer: this.kernel.dec(dek, filing.filerEnc),
          filedAt: filing.filedAt.toISOString(),
          responseDeadline: filing.responseDeadline ? filing.responseDeadline.toISOString() : null,
        })),
      },
    };
  }

  async preferences(userId: string) {
    const row = await this.kernel.prisma.notificationPreference.findUnique({ where: { userId } });
    return { inApp: row?.inApp ?? true, email: row?.email ?? true, sms: row?.sms ?? false, connected: this.connected };
  }

  async savePreferences(userId: string, input: { inApp?: boolean; email?: boolean; sms?: boolean }) {
    const data = {
      inApp: input.inApp !== false,
      email: input.email !== false,
      sms: input.sms === true,
    };
    await this.kernel.prisma.notificationPreference.upsert({ where: { userId }, update: data, create: { userId, ...data } });
    return data;
  }

  async acceptCallback(payload: string, signature: string, input: { caseNumber?: string; court?: string } & Partial<CourtFilingNotice>) {
    if (!this.connected) fail("NAJIZ_NOT_CONNECTED", 503, "NAJIZ_NOT_CONNECTED");
    const filing = parseFiling(input);
    if (!filing || !input.caseNumber || !input.court) fail("VALIDATION", 400, "Callback is incomplete");
    const expected = canonicalFiling({ ...filing, caseNumber: input.caseNumber, court: input.court });
    if (payload !== expected || !this.source.verifyCallback(payload, signature)) fail("NAJIZ_SIGNATURE", 401, "Callback signature was rejected");
    return this.ingest(input.caseNumber, input.court, filing);
  }

  async pollOnce() {
    if (!this.connected) return { connected: false, checked: 0 };
    const rows = await this.kernel.prisma.trackedCase.findMany({ take: 100, include: { user: { select: { wrappedDataKey: true } } } });
    let checked = 0;
    for (const row of rows) {
      const dek = this.kernel.dekOf(row.user.wrappedDataKey);
      const caseNumber = this.kernel.dec(dek, row.caseNumberEnc);
      const filings = await this.source.poll({ caseNumber, court: row.court });
      checked += 1;
      for (const filing of filings) await this.ingest(caseNumber, row.court, filing);
      await this.kernel.prisma.trackedCase.update({ where: { id: row.id }, data: { status: "watching" } });
    }
    return { connected: true, checked };
  }

  private async ingest(caseNumber: string, court: string, filing: CourtFilingNotice) {
    const key = caseKey(court, caseNumber);
    const cases = await this.kernel.prisma.trackedCase.findMany({ where: { caseKey: key, court }, include: { user: true } });
    let created = 0;
    for (const tracked of cases) {
      const dek = this.kernel.dekOf(tracked.user.wrappedDataKey);
      try {
        const saved = await this.kernel.prisma.caseFiling.create({
          data: {
            caseId: tracked.id,
            externalId: filing.externalId,
            titleEnc: this.kernel.enc(dek, filing.title),
            filerEnc: this.kernel.enc(dek, filing.filer),
            filedAt: new Date(filing.filedAt),
            responseDeadline: filing.responseDeadline ? new Date(filing.responseDeadline) : null,
            sourceHash: sourceHash(filing),
          },
        });
        created += 1;
        await this.notify(tracked.userId, tracked.user.email, tracked.user.phone, tracked.court, caseNumber, saved.id, filing);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }
    }
    return { created };
  }

  private async notify(userId: string, email: string, phone: string, court: string, caseNumber: string, filingId: string, filing: CourtFilingNotice) {
    const pref = await this.kernel.prisma.notificationPreference.findUnique({ where: { userId } });
    const inApp = pref?.inApp ?? true;
    const sendEmail = pref?.email ?? true;
    const sendSms = pref?.sms === true;
    if (inApp) await this.kernel.prisma.courtNotice.create({ data: { userId, filingId } });
    const replyUrl = `${this.kernel.config.webOrigin.replace(/\/$/, "")}/app?court=${encodeURIComponent(court)}&memo=reply&caseNumber=${encodeURIComponent(caseNumber)}`;
    if (sendEmail) {
      await sendFilingMail(this.kernel.config, email, {
        caseNumber,
        court,
        title: filing.title,
        filer: filing.filer,
        filedAt: new Date(filing.filedAt),
        responseDeadline: filing.responseDeadline ? new Date(filing.responseDeadline) : null,
        replyUrl,
      }).catch(() => undefined);
    }
    const sms = smsProviderFor(this.kernel.config);
    if (sendSms && sms) await sms.send(phone, `مذكرة جديدة في القضية ${caseNumber}`).catch(() => undefined);
  }
}
