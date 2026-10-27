import { createHash, randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { generateDek, wrapKey } from "./domain/envelope";
import { generateOtpCode, hashOtp, isPhone, normalizePhone, otpMatches } from "./domain/otp";
import { fail } from "./http-error";
import { Kernel } from "./kernel";
import { presentUser } from "./present";

@Injectable()
export class AuthService {
  constructor(
    private readonly kernel: Kernel,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: { name: string; phone: string; email: string; consent: boolean }) {
    if (input.consent !== true) fail("CONSENT_REQUIRED", 400, "Consent is required");
    const phone = normalizePhone(input.phone);
    const email = input.email.trim().toLowerCase();
    if (!isPhone(phone)) fail("VALIDATION", 400, "Enter a valid mobile number");
    const existing = await this.kernel.prisma.user.findFirst({ where: { OR: [{ phone }, { email }] } });
    if (existing) fail("ACCOUNT_EXISTS", 409, "An account already uses this mobile or email");
    const dek = generateDek();
    const user = await this.kernel.prisma.user.create({
      data: {
        name: input.name.trim(),
        phone,
        email,
        consentAt: new Date(),
        consentVersion: this.kernel.config.consentVersion,
        wrappedDataKey: wrapKey(dek, this.kernel.master),
        wallet: { create: { balanceHalalas: 0 } },
      },
    });
    const challenge = await this.issueOtp(user.id, phone);
    return challenge;
  }

  async login(identifier: string) {
    const value = identifier.trim();
    const phone = value.includes("@") ? "" : normalizePhone(value);
    const email = value.includes("@") ? value.toLowerCase() : "";
    const user = await this.kernel.prisma.user.findFirst({
      where: email ? { email } : { phone },
    });
    if (!user) fail("NOT_FOUND", 404, "No account matches that mobile or email");
    return this.issueOtp(user.id, email || phone);
  }

  async verify(challengeId: string, code: string) {
    const challenge = await this.kernel.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) {
      fail("OTP_INVALID", 400, "The code is wrong or expired");
    }
    if (!otpMatches(code, challenge.codeHash, this.kernel.config.otpPepper)) {
      fail("OTP_INVALID", 400, "The code is wrong or expired");
    }
    await this.kernel.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    const user = await this.kernel.prisma.user.update({
      where: { id: challenge.userId },
      data: { phoneVerifiedAt: new Date(), emailVerifiedAt: new Date() },
    });
    return this.tokensFor(user.id);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) fail("UNAUTHENTICATED", 401, "Sign in again");
    const refreshHash = sha(refreshToken);
    const session = await this.kernel.prisma.session.findUnique({ where: { refreshHash } });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      fail("UNAUTHENTICATED", 401, "Sign in again");
    }
    await this.kernel.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return this.tokensFor(session.userId);
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;
    await this.kernel.prisma.session.updateMany({
      where: { refreshHash: sha(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async ensureAdmin() {
    if (!this.kernel.config.adminEmail || !this.kernel.config.adminPassword) return;
    const email = this.kernel.config.adminEmail.toLowerCase();
    const existing = await this.kernel.prisma.adminAccount.findUnique({ where: { email } });
    if (existing) return;
    await this.kernel.prisma.adminAccount.create({
      data: {
        email,
        name: "Admin",
        passwordHash: await bcrypt.hash(this.kernel.config.adminPassword, 10),
      },
    });
  }

  async adminLogin(email: string, password: string) {
    const admin = await this.kernel.prisma.adminAccount.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      fail("UNAUTHENTICATED", 401, "Admin sign-in failed");
    }
    const accessToken = await this.jwt.signAsync({ sub: admin.id, role: "admin" }, { expiresIn: "8h" });
    return { accessToken, name: admin.name };
  }

  private async tokensFor(userId: string) {
    const user = await this.kernel.prisma.user.findUnique({ where: { id: userId } });
    if (!user) fail("NOT_FOUND", 404, "Account was not found");
    const refreshToken = randomBytes(32).toString("hex");
    await this.kernel.prisma.session.create({
      data: {
        userId,
        refreshHash: sha(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
    const accessToken = await this.jwt.signAsync({ sub: userId, role: "user" }, { expiresIn: "12h" });
    return { accessToken, refreshToken, user: presentUser(user) };
  }

  private async issueOtp(userId: string, target: string) {
    const code = generateOtpCode();
    const challenge = await this.kernel.prisma.otpChallenge.create({
      data: {
        userId,
        target,
        codeHash: hashOtp(code, this.kernel.config.otpPepper),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    await this.dispatchSms(target, code);
    return {
      challengeId: challenge.id,
      ...(this.kernel.config.otpDebug ? { debugCode: code } : {}),
    };
  }

  private async dispatchSms(target: string, code: string) {
    if (this.kernel.config.smsProvider === "mock" || !this.kernel.config.smsApiKey) return;
    await fetch(this.kernel.config.smsBaseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.kernel.config.smsApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: target, sender: this.kernel.config.smsSender, body: code }),
    });
  }
}

function sha(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
