import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { JURISDICTION_CATALOG, jurisdictionOf } from "@elawyer/types";
import { PlanCode } from "@prisma/client";
import { buildTrandata, decryptTrandata, encryptTrandata } from "./domain/alrajhi";
import { PLAN_DEFS } from "./domain/plans";
import { halalasToSar, nextInvoiceNumber, splitVatInclusive, zatcaQrBase64 } from "./domain/invoice";
import { assertSandboxGateway, sandboxSignatureOk, signSandbox } from "./domain/payments";
import { fail } from "./http-error";
import { decryptString } from "./domain/envelope";
import { Kernel } from "./kernel";
import { screenLayperson } from "./auth.service";

@Injectable()
export class BillingService {
  constructor(private readonly kernel: Kernel) {}

  async plans() {
    const pay = this.kernel.config.payPerMemoHalalas;
    const plans = await Promise.all(
      (Object.keys(PLAN_DEFS) as PlanCode[]).map(async (code) => {
        const plan = await this.kernel.plan(code);
        return {
          code,
          jurisdiction: plan.jurisdiction,
          currency: plan.currency,
          priceHalalas: plan.priceHalalas,
          memoLimit: plan.memoLimit,
          chatLimit: plan.chatLimit,
          chatTurnsPerMemo: plan.chatTurnsPerMemo,
          uploadPagesPerMemo: plan.uploadPagesPerMemo,
          validityDays: plan.validityDays,
          courts: plan.courts,
          word: plan.word,
          caseManagement: plan.caseManagement,
          letterhead: plan.letterhead,
          payPerMemoHalalas: pay,
          oneTime: true as const,
          autoRenew: false as const,
        };
      }),
    );
    return { payPerMemoHalalas: pay, plans };
  }

  async checkout(userId: string, input: {
    purpose: "topup" | "subscription";
    amountHalalas?: number;
    planCode?: PlanCode;
    cycle?: "monthly" | "yearly";
    idempotencyKey?: string;
  }) {
    const account = await this.kernel.prisma.user.findUnique({ where: { id: userId } });
    if (!account) fail("NOT_FOUND", 404, "Account was not found");
    const place = jurisdictionOf(account.jurisdiction);
    const key = input.idempotencyKey || randomUUID();
    const existing = await this.kernel.prisma.paymentIntent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return this.redirectFor(existing.id, existing.amountHalalas);
    let amount = input.amountHalalas || 0;
    let planCode: PlanCode | null = null;
    const cycle = input.cycle || "monthly";
    if (input.purpose === "subscription") {
      const nationalId = account.nationalIdEnc ? decryptString(account.nationalIdEnc, this.kernel.dekOf(account.wrappedDataKey)) : "";
      await screenLayperson(this.kernel.config, { name: account.name, phone: account.phone, email: account.email, nationalId });
      if (input.cycle === "yearly") fail("RECURRING_DISABLED", 400, "Plans are a one-time payment and do not renew");
      if (!input.planCode || input.planCode === "free") fail("VALIDATION", 400, "Choose a paid plan");
      const plan = await this.kernel.plan(input.planCode, place.code);
      amount = plan.priceHalalas;
      planCode = input.planCode;
    }
    if (!Number.isInteger(amount) || amount < 100) fail("VALIDATION", 400, "Amount is too small");
    const intent = await this.kernel.prisma.paymentIntent.create({
      data: {
        userId,
        purpose: input.purpose,
        planCode: planCode ?? undefined,
        cycle: input.purpose === "subscription" ? "once" : cycle,
        amountHalalas: amount,
        jurisdiction: place.code,
        currency: place.currency,
        idempotencyKey: key,
        gateway: this.kernel.config.paymentGateway,
      },
    });
    return this.redirectFor(intent.id, amount);
  }

  async confirmSandbox(intentId: string, sig: string) {
    this.requireSandbox();
    if (!sandboxSignatureOk(this.kernel.config.paymentSandboxSecret, intentId, sig)) {
      fail("PAYMENT_SIGNATURE", 400, "Payment signature was rejected");
    }
    return this.fulfill(intentId, `paid:${intentId}`);
  }

  async webhook(body: { intentId?: string; status?: string; eventKey?: string }, signature: string) {
    this.requireSandbox();
    const eventKey = body.eventKey || "";
    if (!eventKey || !sandboxSignatureOk(this.kernel.config.paymentSandboxSecret, eventKey, signature)) {
      fail("PAYMENT_SIGNATURE", 400, "Webhook signature was rejected");
    }
    if (body.status !== "CAPTURED" || !body.intentId) fail("PAYMENT_REJECTED", 400, "Payment was not captured");
    return this.fulfill(body.intentId, `paid:${body.intentId}`);
  }

  async gatewayCallback(body: Record<string, string>) {
    const secret = this.kernel.config.alrajhiResourceKey;
    if (!secret || !body.trandata) fail("PAYMENT_REJECTED", 400, "Gateway payload is incomplete");
    const decoded = JSON.parse(decryptTrandata(body.trandata, secret)) as Array<Record<string, string>>;
    const row = decoded[0] || {};
    const intent = await this.kernel.prisma.paymentIntent.findUnique({ where: { id: row.trackId } });
    if (!intent) fail("NOT_FOUND", 404, "Payment was not found");
    const captured = row.result === "CAPTURED" || row.result === "SUCCESS";
    const amountOk = row.amt === halalasToSar(intent.amountHalalas);
    if (!captured || !amountOk) {
      await this.kernel.prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: "failed" } });
      return { status: "failed" };
    }
    await this.fulfill(intent.id, `paid:${intent.id}`);
    return { status: "paid" };
  }

  hostedForm(intentId: string) {
    const cfg = this.kernel.config;
    if (!cfg.alrajhiTranportalId || !cfg.alrajhiResourceKey || !cfg.alrajhiTranportalPassword) {
      fail("PAYMENT_NOT_CONFIGURED", 503, "Al Rajhi merchant credentials are not set");
    }
    return this.kernel.prisma.paymentIntent.findUnique({ where: { id: intentId } }).then((intent) => {
      if (!intent) fail("NOT_FOUND", 404, "Payment was not found");
      const place = jurisdictionOf(intent.jurisdiction);
      if (intent.currency !== place.currency || place.currency !== JURISDICTION_CATALOG.SA.currency) {
        fail("PAYMENT_NOT_CONFIGURED", 503, "This currency is not routed to Al Rajhi");
      }
      const trandata = encryptTrandata(
        buildTrandata({
          tranportalId: cfg.alrajhiTranportalId,
          password: cfg.alrajhiTranportalPassword,
          amountSar: halalasToSar(intent.amountHalalas),
          currencyCode: place.numericCurrency,
          trackId: intent.id,
          responseUrl: cfg.alrajhiResponseUrl,
          errorUrl: cfg.alrajhiErrorUrl,
        }),
        cfg.alrajhiResourceKey,
      );
      const action = cfg.alrajhiHostedUrl;
      return `<!doctype html><meta charset="utf-8"><title>Payment</title>
        <form id="pay" method="post" action="${action}">
          <input type="hidden" name="tranportalId" value="${cfg.alrajhiTranportalId}" />
          <input type="hidden" name="trandata" value="${trandata}" />
          <input type="hidden" name="responseURL" value="${cfg.alrajhiResponseUrl}" />
          <input type="hidden" name="errorURL" value="${cfg.alrajhiErrorUrl}" />
        </form><script>document.getElementById('pay').submit()</script>`;
    });
  }

  private requireSandbox() {
    try {
      assertSandboxGateway(this.kernel.config.paymentGateway);
    } catch {
      fail("NOT_FOUND", 404, "Sandbox confirmation is not available");
    }
  }

  private redirectFor(intentId: string, _amount: number) {
    if (this.kernel.config.paymentGateway === "alrajhi") {
      return { intentId, redirectUrl: `${this.kernel.config.apiPublicUrl}/api/payments/redirect/${intentId}` };
    }
    const sig = signSandbox(this.kernel.config.paymentSandboxSecret, intentId);
    return { intentId, redirectUrl: `${this.kernel.config.webOrigin}/pay/sandbox/${intentId}?sig=${sig}` };
  }

  private async fulfill(intentId: string, eventKey: string) {
    const intent = await this.kernel.prisma.paymentIntent.findUnique({ where: { id: intentId } });
    if (!intent) fail("NOT_FOUND", 404, "Payment was not found");
    if (intent.status === "paid") return { status: "paid", duplicate: true };
    const user = await this.kernel.prisma.user.findUnique({ where: { id: intent.userId } });
    if (!user) fail("NOT_FOUND", 404, "Account was not found");
    const place = jurisdictionOf(intent.jurisdiction);
    const split = splitVatInclusive(intent.amountHalalas, place.vatRateBps);
    const hash = createHash("sha256").update(eventKey).digest("hex");
    try {
      await this.kernel.prisma.$transaction(async (tx) => {
        await tx.paymentEvent.create({ data: { intentId, eventKey, payloadHash: hash } });
        const updated = await tx.paymentIntent.updateMany({
          where: { id: intentId, status: "pending" },
          data: { status: "paid", gatewayRef: eventKey },
        });
        if (updated.count === 0) return;
        const seq = await tx.invoiceSequence.upsert({
          where: { id: 1 },
          create: { id: 1, value: 1 },
          update: { value: { increment: 1 } },
        });
        const issued = new Date();
        const number = nextInvoiceNumber(issued.getUTCFullYear(), seq.value);
        const description = intent.purpose === "subscription" ? `Plan ${intent.planCode}` : "Wallet top-up";
        await tx.invoice.create({
          data: {
            userId: user.id,
            number,
            uuid: randomUUID(),
            subtotalHalalas: split.subtotalHalalas,
            vatRateBps: split.vatRateBps,
            vatHalalas: split.vatHalalas,
            totalHalalas: split.totalHalalas,
            sellerName: this.kernel.config.sellerName,
            sellerVat: this.kernel.config.sellerVat,
            sellerAddress: this.kernel.config.sellerAddress,
            buyerName: user.name,
            jurisdiction: intent.jurisdiction,
            currency: intent.currency,
            qrTlvBase64: zatcaQrBase64({
              sellerName: this.kernel.config.sellerName,
              vatNumber: this.kernel.config.sellerVat,
              timestamp: issued.toISOString(),
              totalSar: halalasToSar(split.totalHalalas),
              vatSar: halalasToSar(split.vatHalalas),
            }),
            lineDescription: description,
            issuedAt: issued,
          },
        });
        if (intent.purpose === "topup") {
          await tx.wallet.update({
            where: { userId: user.id },
            data: { balanceHalalas: { increment: intent.amountHalalas } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: user.id,
              type: "topup",
              amountHalalas: intent.amountHalalas,
              idempotencyKey: eventKey,
              description: "Wallet top-up",
            },
          });
        } else if (intent.planCode) {
          const days = PLAN_DEFS[intent.planCode].validityDays || 30;
          const expires = new Date(issued);
          expires.setUTCDate(expires.getUTCDate() + days);
          await tx.user.update({
            where: { id: user.id },
            data: {
              planCode: intent.planCode,
              planExpiresAt: expires,
              memoCountPeriod: 0,
              chatCountPeriod: 0,
              periodStartedAt: issued,
              planReminderKey: null,
            },
          });
          await tx.walletTransaction.create({
            data: {
              userId: user.id,
              type: "subscription",
              amountHalalas: intent.amountHalalas,
              idempotencyKey: eventKey,
              description: `One-time plan ${intent.planCode}`,
            },
          });
        }
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return { status: "paid", duplicate: true };
      throw error;
    }
    return { status: "paid", duplicate: false };
  }
}
