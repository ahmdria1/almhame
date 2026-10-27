import { DEFAULT_JURISDICTION, JURISDICTION_CATALOG, jurisdictionOf } from "@elawyer/types";
import { createHash, randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { generateDek, wrapKey } from "./domain/envelope";
import { generateOtpCode, hashOtp, isPhone, normalizePhone, otpMatches } from "./domain/otp";
import { debugCodeResponseEnabled } from "./config";
import { fail } from "./http-error";
import { Kernel } from "./kernel";
import { sendAuthMail } from "./mail";
import { presentUser } from "./present";

@Injectable()
export class AuthService {
  constructor(
    private readonly kernel: Kernel,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: { name: string; phone: string; email: string; password: string; consent: boolean }) {
    if (input.consent !== true) fail("CONSENT_REQUIRED", 400, "Consent is required");
    const phone = normalizePhone(input.phone);
    const email = input.email.trim().toLowerCase();
    this.assertPassword(input.password);
    if (!isPhone(phone)) fail("VALIDATION", 400, "Enter a valid mobile number");
    const existing = await this.kernel.prisma.user.findFirst({ where: { OR: [{ phone }, { email }] } });
    if (existing) fail("ACCOUNT_EXISTS", 409, "An account already uses this mobile or email");
    const dek = generateDek();
    const user = await this.kernel.prisma.user.create({
      data: {
        name: input.name.trim(),
        phone,
        email,
        passwordHash: await bcrypt.hash(input.password, 10),
        consentAt: new Date(),
        consentVersion: this.kernel.config.consentVersion,
        jurisdiction: DEFAULT_JURISDICTION,
        wrappedDataKey: wrapKey(dek, this.kernel.master),
        wallet: { create: { balanceHalalas: 0, currency: JURISDICTION_CATALOG[DEFAULT_JURISDICTION].currency } },
      },
    });
    const challenge = await this.issueEmail(user.id, null, email, "email_verify");
    return challenge;
  }

  async resend(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.kernel.prisma.user.findUnique({ where: { email } });
    if (!user) fail("NOT_FOUND", 404, "No account matches that email");
    if (user.emailVerifiedAt) fail("VALIDATION", 400, "This email is already confirmed");
    return this.issueEmail(user.id, null, email, "email_verify");
  }

  async login(emailRaw: string, password: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.kernel.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      fail("UNAUTHENTICATED", 401, "Email or password is wrong");
    }
    if (!user.emailVerifiedAt) fail("EMAIL_UNVERIFIED", 403, "Confirm the email before signing in");
    return this.tokensFor(user.id);
  }

  async forgot(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.kernel.prisma.user.findUnique({ where: { email } });
    if (!user) return { ok: true as const };
    const challenge = await this.issueEmail(user.id, null, email, "password_reset");
    return { ok: true as const, ...challenge };
  }

  async resetPassword(challengeId: string, code: string, password: string) {
    this.assertPassword(password);
    const challenge = await this.consume(challengeId, code, "password_reset");
    if (!challenge.userId) fail("OTP_INVALID", 400, "The code is wrong or expired");
    await this.kernel.prisma.user.update({
      where: { id: challenge.userId },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    return { ok: true };
  }

  async verify(challengeId: string, code: string) {
    const challenge = await this.consume(challengeId, code, "email_verify");
    if (!challenge.userId) fail("OTP_INVALID", 400, "The code is wrong or expired");
    await this.kernel.prisma.user.update({
      where: { id: challenge.userId },
      data: { emailVerifiedAt: new Date() },
    });
    return this.tokensFor(challenge.userId);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) fail("UNAUTHENTICATED", 401, "Sign in again");
    const refreshHash = sha(refreshToken);
    const session = await this.kernel.prisma.session.findUnique({ where: { refreshHash } });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      fail("UNAUTHENTICATED", 401, "Sign in again");
    }
    const user = await this.kernel.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user?.emailVerifiedAt) fail("EMAIL_UNVERIFIED", 403, "Confirm the email before signing in");
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

  async inviteAdmin(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    if (!email.includes("@")) fail("VALIDATION", 400, "A valid email is required");
    const existing = await this.kernel.prisma.adminAccount.count();
    if (existing > 0) fail("ACCOUNT_EXISTS", 409, "An admin already exists");
    const admin = await this.kernel.prisma.adminAccount.create({
      data: {
        email,
        name: "المسؤول",
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      },
    });
    return this.issueEmail(null, admin.id, email, "admin_activate");
  }

  async activateAdmin(challengeId: string, code: string, password: string) {
    this.assertPassword(password);
    const challenge = await this.consume(challengeId, code, "admin_activate");
    if (!challenge.adminId) fail("OTP_INVALID", 400, "The code is wrong or expired");
    await this.kernel.prisma.adminAccount.update({
      where: { id: challenge.adminId },
      data: { passwordHash: await bcrypt.hash(password, 10), emailVerifiedAt: new Date() },
    });
    return { ok: true };
  }

  async adminLogin(email: string, password: string) {
    const admin = await this.kernel.prisma.adminAccount.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      fail("UNAUTHENTICATED", 401, "Admin sign-in failed");
    }
    if (!admin.emailVerifiedAt) fail("EMAIL_UNVERIFIED", 403, "Confirm the admin email first");
    const accessToken = await this.jwt.signAsync({ sub: admin.id, role: "admin" }, { expiresIn: "8h" });
    return { accessToken, name: admin.name };
  }

  private assertPassword(password: string) {
    if (!password || password.length < 8 || password.length > 72) {
      fail("VALIDATION", 400, "Use a password of 8 to 72 characters");
    }
  }

  private async tokensFor(userId: string) {
    const user = await this.kernel.prisma.user.findUnique({ where: { id: userId } });
    if (!user) fail("NOT_FOUND", 404, "Account was not found");
    const plan = await this.kernel.plan(user.planCode, jurisdictionOf(user.jurisdiction).code);
    const refreshToken = randomBytes(32).toString("hex");
    await this.kernel.prisma.session.create({
      data: {
        userId,
        refreshHash: sha(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
    const accessToken = await this.jwt.signAsync({ sub: userId, role: "user" }, { expiresIn: "12h" });
    return { accessToken, refreshToken, user: presentUser(user, plan) };
  }

  private async issueEmail(userId: string | null, adminId: string | null, target: string, purpose: string) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.kernel.prisma.otpChallenge.count({
      where: { target, purpose, createdAt: { gte: since } },
    });
    if (recent >= 5) fail("RATE_LIMIT", 429, "Wait before requesting another email");
    const code = generateOtpCode();
    const challenge = await this.kernel.prisma.otpChallenge.create({
      data: {
        userId,
        adminId,
        purpose,
        target,
        codeHash: hashOtp(code, this.kernel.config.otpPepper),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    const origin = purpose === "admin_activate" ? this.kernel.config.adminOrigin : this.kernel.config.webOrigin;
    const pathName = purpose === "password_reset" ? "/reset" : purpose === "admin_activate" ? "/activate" : "/otp";
    const link = `${origin}${pathName}?challenge=${challenge.id}`;
    await sendAuthMail(this.kernel.config, { to: target, code, purpose, link });
    return {
      challengeId: challenge.id,
      ...(debugCodeResponseEnabled(this.kernel.config) ? { debugCode: code } : {}),
    };
  }

  private async consume(challengeId: string, code: string, purpose: string) {
    const challenge = await this.kernel.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.purpose !== purpose || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) {
      fail("OTP_INVALID", 400, "The code is wrong or expired");
    }
    if (!otpMatches(code, challenge.codeHash, this.kernel.config.otpPepper)) {
      const attempts = challenge.attempts + 1;
      await this.kernel.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts, ...(attempts >= 5 ? { consumedAt: new Date() } : {}) },
      });
      fail("OTP_INVALID", 400, "The code is wrong or expired");
    }
    await this.kernel.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    return challenge;
  }
}

function sha(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
