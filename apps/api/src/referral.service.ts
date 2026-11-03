import { randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";
import { fail } from "./http-error";
import { Kernel } from "./kernel";

@Injectable()
export class ReferralService {
  constructor(private readonly kernel: Kernel) {}

  async mine(userId: string) {
    const user = await this.kernel.prisma.user.findUnique({ where: { id: userId } });
    if (!user) fail("NOT_FOUND", 404, "Account was not found");
    return { code: user.referralCode };
  }

  async claim(userId: string, code: string) {
    const clean = code.trim();
    if (clean.length < 4) fail("VALIDATION", 400, "Code is invalid");
    const referrer = await this.kernel.prisma.user.findUnique({ where: { referralCode: clean } });
    if (!referrer || referrer.id === userId) fail("VALIDATION", 400, "Code is invalid");
    await this.kernel.prisma.referral.create({ data: { referrerId: referrer.id, referredUserId: userId } });
    return { ok: true };
  }
}

export function newReferralCode(): string {
  return randomBytes(6).toString("hex");
}
