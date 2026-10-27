import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { PlanCode } from "@prisma/client";
import { PLAN_DEFS, yearlyHalalas } from "./domain/plans";
import { halalasToSar, nextInvoiceNumber, splitVatInclusive, zatcaQrBase64 } from "./domain/invoice";
import {
  buildTrandata,
  decryptTrandata,
  encryptTrandata,
  sandboxSignatureOk,
  signSandbox,
} from "./domain/payments";
import { fail } from "./http-error";
import { Kernel } from "./kernel";

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
          priceHalalas: plan.priceHalalas,
          yearlyHalalas: yearlyHalalas(plan.priceHalalas),
          memoLimit: plan.memoLimit,
          chatLimit: plan.chatLimit,
          courts: plan.courts,
          word: plan.word,
          caseManagement: plan.caseManagement,
          letterhead: plan.letterhead,
          seats: plan.seats,
          payPerMemoHalalas: pay,
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
    const key = input.idempotencyKey || randomUUID();
    const existing = await this.kernel.prisma.paymentIntent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return this.redirectFor(existing.id, existing.amountHalalas);
    let amount = input.amountHalalas || 0;
    let planCode: PlanCode | null = null;
    const cycle = input.cycle || "monthly";
    if (input.purpose === "subscription") {
      if (!input.planCode || input.planCode === "free") fail("VALIDATION", 400, "Choose a paid plan");
      const plan = await this.kernel.plan(input.planCode);
      amount = cycle === "yearly" ? yearlyHalalas(plan.priceHalalas) : plan.priceHalalas;
      planCode = input.planCode;
    }
    if (!Number.isInteger(amount) || amount < 100) fail("VALIDATION", 400, "Amount is too small");
    const intent = await this.kernel.prisma.paymentIntent.create({
      data: {
        userId,
        purpose: input.purpose,
        planCode: planCode ?? undefined,
        cycle,
        amountHalalas: amount,
        idempotencyKey: key,
        gateway: this.kernel.config.paymentGateway,
      },
    });
    return this.redirectFor(intent.id, amount);
  }

  async confirmSandbox(intentId: string, sig: string) {
    if (!sandboxSignatureOk(this.kernel.config.paymentSandboxSecret, intentId, sig)) {
      fail("PAYMENT_SIGNATURE", 400, "Payment signature was rejected");
    }
    return this.fulfill(intentId, `paid:${intentId}`);
  }

  async webhook(body: { intentId?: string; status?: string; eventKey?: string }, signature: string) {
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
      const trandata = encryptTrandata(
        buildTrandata({
          tranportalId: cfg.alrajhiTranportalId,
          password: cfg.alrajhiTranportalPassword,
          amountSar: halalasToSar(intent.amountHalalas),
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
    const split = splitVatInclusive(intent.amountHalalas);
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
          const renews = new Date(issued);
          renews.setUTCDate(renews.getUTCDate() + (intent.cycle === "yearly" ? 365 : 30));
          await tx.user.update({
            where: { id: user.id },
            data: { planCode: intent.planCode, planRenewsAt: renews, memoCountPeriod: 0, periodStartedAt: issued },
          });
          await tx.walletTransaction.create({
            data: {
              userId: user.id,
              type: "subscription",
              amountHalalas: intent.amountHalalas,
              idempotencyKey: eventKey,
              description: `Plan ${intent.planCode}`,
            },
          });
          if (intent.planCode === "office") {
            const seats = PLAN_DEFS.office.seats;
            const org = await tx.organization.findUnique({ where: { ownerId: user.id } });
            if (!org) {
              const created = await tx.organization.create({
                data: { name: user.name, ownerId: user.id, seatLimit: seats, letterheadName: "" },
              });
              await tx.user.update({ where: { id: user.id }, data: { orgId: created.id, orgRole: "owner" } });
            } else {
              await tx.organization.update({ where: { id: org.id }, data: { seatLimit: seats } });
            }
          }
        }
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return { status: "paid", duplicate: true };
      throw error;
    }
    return { status: "paid", duplicate: false };
  }
}
