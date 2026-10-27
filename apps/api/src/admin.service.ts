import { Injectable } from "@nestjs/common";
import { DEFAULT_JURISDICTION, PLAN_CODES } from "@elawyer/types";
import { PlanCode } from "@prisma/client";
import { CorpusService } from "./corpus.service";
import { fail } from "./http-error";
import { Kernel } from "./kernel";

@Injectable()
export class AdminService {
  constructor(
    private readonly kernel: Kernel,
    private readonly corpus: CorpusService,
  ) {}

  async stats() {
    const [users, revenue, memoGroups, planGroups, corpus] = await Promise.all([
      this.kernel.prisma.user.count(),
      this.kernel.prisma.invoice.aggregate({ _sum: { totalHalalas: true } }),
      this.kernel.prisma.memo.groupBy({ by: ["court"], _count: { _all: true } }),
      this.kernel.prisma.user.groupBy({ by: ["planCode"], _count: { _all: true } }),
      this.corpus.counts(),
    ]);
    const activeSubscriptions = planGroups
      .filter((row) => row.planCode !== "free")
      .reduce((sum, row) => sum + row._count._all, 0);
    return {
      users,
      activeSubscriptions,
      revenueHalalas: revenue._sum.totalHalalas || 0,
      memos: memoGroups.reduce((sum, row) => sum + row._count._all, 0),
      memosByCourt: Object.fromEntries(memoGroups.map((row) => [row.court, row._count._all])),
      subscriptionsByPlan: Object.fromEntries(planGroups.map((row) => [row.planCode, row._count._all])),
      corpus,
    };
  }

  async users() {
    const [total, verified, rows] = await Promise.all([
      this.kernel.prisma.user.count(),
      this.kernel.prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      this.kernel.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          email: true,
          phone: true,
          planCode: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      }),
    ]);
    return {
      total,
      verified,
      unverified: total - verified,
      rows: rows.map((row) => ({
        id: row.id,
        email: row.email,
        phone: row.phone,
        planCode: row.planCode,
        status: row.emailVerifiedAt ? "active" : "inactive",
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async plans() {
    const rows = await this.kernel.prisma.planSetting.findMany({ orderBy: { code: "asc" } });
    return rows;
  }

  async updatePlan(code: string, input: { priceHalalas?: number; memoLimit?: number; chatLimit?: number | null }) {
    if (!PLAN_CODES.includes(code as PlanCode)) fail("VALIDATION", 400, "Unknown plan");
    const priceHalalas = Number(input.priceHalalas);
    const memoLimit = Number(input.memoLimit);
    if (!Number.isInteger(priceHalalas) || priceHalalas < 0) fail("VALIDATION", 400, "Price is invalid");
    if (!Number.isInteger(memoLimit) || memoLimit < 0) fail("VALIDATION", 400, "Quota is invalid");
    const chatLimit = input.chatLimit == null || input.chatLimit === ("" as unknown) ? null : Number(input.chatLimit);
    if (chatLimit != null && (!Number.isInteger(chatLimit) || chatLimit < 0)) fail("VALIDATION", 400, "Chat quota is invalid");
    return this.kernel.prisma.planSetting.update({
      where: { jurisdiction_code: { jurisdiction: DEFAULT_JURISDICTION, code: code as PlanCode } },
      data: { priceHalalas, memoLimit, chatLimit },
    });
  }

  async payments() {
    const [invoices, intents] = await Promise.all([
      this.kernel.prisma.invoice.findMany({
        orderBy: { issuedAt: "desc" },
        take: 100,
        select: {
          id: true,
          number: true,
          totalHalalas: true,
          vatHalalas: true,
          currency: true,
          issuedAt: true,
          user: { select: { email: true, planCode: true } },
        },
      }),
      this.kernel.prisma.paymentIntent.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          purpose: true,
          planCode: true,
          amountHalalas: true,
          status: true,
          gateway: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);
    return {
      invoices: invoices.map((row) => ({
        id: row.id,
        number: row.number,
        totalHalalas: row.totalHalalas,
        vatHalalas: row.vatHalalas,
        currency: row.currency,
        issuedAt: row.issuedAt.toISOString(),
        email: row.user.email,
        planCode: row.user.planCode,
      })),
      intents: intents.map((row) => ({
        id: row.id,
        purpose: row.purpose,
        planCode: row.planCode,
        amountHalalas: row.amountHalalas,
        status: row.status,
        gateway: row.gateway,
        createdAt: row.createdAt.toISOString(),
        email: row.user.email,
      })),
    };
  }

  async audit() {
    const rows = await this.kernel.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return rows.map((row) => ({
      id: row.id,
      actorType: row.actorType,
      action: row.action,
      entityType: row.entityType,
      createdAt: row.createdAt.toISOString(),
      ip: row.ip,
    }));
  }

  settings() {
    const cfg = this.kernel.config;
    return {
      nodeEnv: cfg.nodeEnv,
      llmProvider: cfg.llmProvider,
      embeddingProvider: cfg.embeddingProvider,
      paymentGateway: cfg.paymentGateway,
      smsProvider: cfg.smsProvider,
      smtpConfigured: Boolean(cfg.smtpHost && cfg.smtpFrom),
      emailDebug: cfg.emailDebug,
    };
  }
}
