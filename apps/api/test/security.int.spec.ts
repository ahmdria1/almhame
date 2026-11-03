import { createServer, type Server } from "net";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AuthService } from "../src/auth.service";
import { Kernel } from "../src/kernel";
import { createApp } from "../src/main";
import { PrismaService } from "../src/prisma.service";
import { pingScanner } from "../src/domain/clamd";
import { signSandbox } from "../src/domain/payments";

describe("authorization and input checks", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let scanner: Server | null = null;
  let seq = Math.floor(Date.now() % 10000000);

  function phone() {
    seq += 1;
    return `05${String(80000000 + (seq % 10000000)).slice(0, 8)}`;
  }

  async function account(name = "مستخدم الفحص") {
    const mobile = phone();
    const email = `sec${seq}@example.sa`;
    const password = "test-pass-123";
    const ip = `203.0.113.${(seq % 200) + 1}`;
    const signup = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .set("X-Forwarded-For", ip)
      .send({ name, phone: mobile, email, password, consent: true })
      .expect(201);
    const verified = await request(app.getHttpServer())
      .post("/api/auth/verify")
      .set("X-Forwarded-For", ip)
      .send({ challengeId: signup.body.challengeId, code: signup.body.debugCode })
      .expect(201);
    return { token: verified.body.accessToken as string, email, password, userId: verified.body.user.id as string, ip };
  }

  beforeAll(async () => {
    const host = process.env.CLAMAV_HOST || "127.0.0.1";
    const port = Number(process.env.CLAMAV_PORT || 3310);
    const live = await pingScanner({ host, port, timeoutMs: 300 });
    if (!live) {
      scanner = createServer((socket) => {
        const chunks: Buffer[] = [];
        socket.on("data", (chunk) => {
          chunks.push(chunk);
          const body = Buffer.concat(chunks);
          if (body.length < 14 || !body.subarray(body.length - 4).equals(Buffer.alloc(4))) return;
          socket.end(Buffer.from("stream: OK\0"));
        });
      });
      await new Promise<void>((resolve) => scanner?.listen(0, "127.0.0.1", () => resolve()));
      const address = scanner.address();
      process.env.CLAMAV_HOST = "127.0.0.1";
      process.env.CLAMAV_PORT = String(address && typeof address === "object" ? address.port : 0);
    }
    process.env.CLAMAV_REQUIRED = "true";
    app = await createApp();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    scanner?.close();
    await app.close();
  });

  it("keeps memos, chats, cases, wallet, and saved items inside the owning account", async () => {
    const first = await account("صاحب الملف");
    const second = await account("حساب آخر");
    const secret = "وقائع خاصة بهذا الحساب لا تظهر لحساب آخر ولا في لوحة الإدارة";
    const chat = await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${first.token}`)
      .send({ court: "labor", memoType: "lawsuit", title: "ملف خاص" })
      .expect(201);
    const chatId = chat.body.chat.id as string;
    const caseId = chat.body.chat.caseId as string;
    await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/messages`)
      .set("Authorization", `Bearer ${first.token}`)
      .send({ text: `${secret}. التفاصيل تكفي لبناء المسودة من الوقائع المكتوبة هنا.` })
      .expect(201);
    const drafted = await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/draft`)
      .set("Authorization", `Bearer ${first.token}`)
      .send({})
      .expect(201);
    const memoId = drafted.body.memo.id as string;
    const saved = await request(app.getHttpServer())
      .post("/api/saved")
      .set("Authorization", `Bearer ${first.token}`)
      .send({ kind: "memo", memoId })
      .expect(201);
    await prisma.wallet.update({ where: { userId: first.userId }, data: { balanceHalalas: 43210 } });
    await prisma.user.update({ where: { id: second.userId }, data: { planCode: "pro" } });

    await request(app.getHttpServer()).get(`/api/chats/${chatId}`).set("Authorization", `Bearer ${second.token}`).expect(404);
    await request(app.getHttpServer()).get(`/api/memos/${memoId}`).set("Authorization", `Bearer ${second.token}`).expect(404);
    await request(app.getHttpServer()).get(`/api/cases/${caseId}`).set("Authorization", `Bearer ${second.token}`).expect(404);
    await request(app.getHttpServer())
      .post(`/api/cases/${caseId}/hearings`)
      .set("Authorization", `Bearer ${second.token}`)
      .send({ kind: "hearing", occursAt: "2026-12-01T09:00:00.000Z", title: "جلسة" })
      .expect(404);
    const otherCases = await request(app.getHttpServer()).get("/api/cases").set("Authorization", `Bearer ${second.token}`).expect(200);
    expect(JSON.stringify(otherCases.body)).not.toContain(caseId);
    const otherSaved = await request(app.getHttpServer()).get("/api/saved").set("Authorization", `Bearer ${second.token}`).expect(200);
    expect(JSON.stringify(otherSaved.body)).not.toContain(memoId);
    await request(app.getHttpServer()).delete(`/api/saved/${saved.body.id}`).set("Authorization", `Bearer ${second.token}`).expect(404);
    const otherWallet = await request(app.getHttpServer()).get("/api/wallet").set("Authorization", `Bearer ${second.token}`).expect(200);
    expect(otherWallet.body.balanceHalalas).not.toBe(43210);
    const ownWallet = await request(app.getHttpServer()).get("/api/wallet?userId=" + first.userId).set("Authorization", `Bearer ${second.token}`).expect(200);
    expect(ownWallet.body.balanceHalalas).not.toBe(43210);
    const ownSearch = await request(app.getHttpServer()).get("/api/search").set("Authorization", `Bearer ${second.token}`).query({ q: "وقائع خاصة" }).expect(200);
    expect(JSON.stringify(ownSearch.body)).not.toContain(secret);

    await prisma.adminAccount.deleteMany();
    const auth = app.get(AuthService);
    const invited = await auth.inviteAdmin(`admin${seq}@example.sa`);
    await request(app.getHttpServer())
      .post("/api/admin/activate")
      .send({ challengeId: invited.challengeId, code: invited.debugCode, password: "AdminPass123" })
      .expect(201);
    const admin = await request(app.getHttpServer())
      .post("/api/admin/login")
      .send({ email: `admin${seq}@example.sa`, password: "AdminPass123" })
      .expect(201);
    const adminToken = admin.body.accessToken as string;
    for (const path of ["/api/admin/stats", "/api/admin/users", "/api/admin/corpus", "/api/admin/audit", "/api/admin/payments"]) {
      const response = await request(app.getHttpServer()).get(path).set("Authorization", `Bearer ${adminToken}`).expect(200);
      expect(JSON.stringify(response.body)).not.toContain(secret);
    }
    await request(app.getHttpServer()).get(`/api/memos/${memoId}`).set("Authorization", `Bearer ${adminToken}`).expect(401);
    await request(app.getHttpServer()).get(`/api/chats/${chatId}`).set("Authorization", `Bearer ${adminToken}`).expect(401);
    await request(app.getHttpServer()).get("/api/admin/stats").set("Authorization", `Bearer ${first.token}`).expect(401);
  });

  it("stops a run of wrong passwords and a run of wrong codes", async () => {
    const ip = "198.51.100.44";
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post("/api/auth/login")
        .set("X-Forwarded-For", ip)
        .send({ email: "nobody@example.sa", password: "wrong-pass-1" });
      expect(response.status).toBe(401);
    }
    const limited = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-Forwarded-For", ip)
      .send({ email: "nobody@example.sa", password: "wrong-pass-1" });
    expect(limited.status).toBe(429);

    const mobile = phone();
    const email = `otp${seq}@example.sa`;
    const signup = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .set("X-Forwarded-For", "198.51.100.45")
      .send({ name: "رمز التحقق", phone: mobile, email, password: "test-pass-123", consent: true })
      .expect(201);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const wrong = await request(app.getHttpServer())
        .post("/api/auth/verify")
        .set("X-Forwarded-For", "198.51.100.46")
        .send({ challengeId: signup.body.challengeId, code: "000000" });
      expect(wrong.status).toBe(400);
      expect(wrong.body.error.code).toBe("OTP_INVALID");
    }
    const spent = await prisma.otpChallenge.findUnique({ where: { id: signup.body.challengeId } });
    expect(spent?.attempts).toBeGreaterThanOrEqual(5);
    expect(spent?.consumedAt).toBeTruthy();
    const replay = await request(app.getHttpServer())
      .post("/api/auth/verify")
      .set("X-Forwarded-For", "198.51.100.47")
      .send({ challengeId: signup.body.challengeId, code: signup.body.debugCode });
    expect(replay.status).toBe(400);

    const again = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .set("X-Forwarded-For", "198.51.100.48")
      .send({ name: "إعادة الإرسال", phone: phone(), email: `resend${seq}@example.sa`, password: "test-pass-123", consent: true })
      .expect(201);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await request(app.getHttpServer())
        .post("/api/auth/resend")
        .set("X-Forwarded-For", `198.51.100.${60 + attempt}`)
        .send({ email: again.body.email || `resend${seq}@example.sa` })
        .expect(201);
    }
    const blockedResend = await request(app.getHttpServer())
      .post("/api/auth/resend")
      .set("X-Forwarded-For", "198.51.100.70")
      .send({ email: `resend${seq}@example.sa` });
    expect(blockedResend.status).toBe(429);
    expect(blockedResend.body.error.code).toBe("RATE_LIMIT");
  });

  it("rejects injection payloads and unsigned payment callbacks", async () => {
    const user = await account("فحص الإدخال");
    const search = await request(app.getHttpServer())
      .get("/api/search")
      .set("Authorization", `Bearer ${user.token}`)
      .query({ q: "' OR 1=1; DROP TABLE \"User\"; --" })
      .expect(200);
    expect(search.body.chats).toEqual([]);
    const badEmail = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-Forwarded-For", "198.51.100.80")
      .send({ email: "foo' OR '1'='1", password: "test-pass-123" });
    expect(badEmail.status).toBe(400);
    const shaped = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .set("X-Forwarded-For", "198.51.100.81")
      .send({ name: "اسم", phone: phone(), email: `role${seq}@example.sa`, password: "test-pass-123", consent: true, role: "admin" })
      .expect(201);
    const created = await prisma.user.findUnique({ where: { email: `role${seq}@example.sa` } });
    expect(created).toBeTruthy();
    const adminCount = await prisma.adminAccount.count({ where: { email: `role${seq}@example.sa` } });
    expect(adminCount).toBe(0);
    expect(shaped.body.debugCode).toMatch(/^\d{6}$/);

    const kernel = app.get(Kernel);
    const unsigned = await request(app.getHttpServer()).post("/api/payments/webhook").send({ intentId: "missing", status: "CAPTURED", eventKey: "evt-missing" });
    expect(unsigned.status).toBe(400);
    expect(unsigned.body.error.code).toBe("PAYMENT_SIGNATURE");
    const wrong = await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("x-signature", "00")
      .send({ intentId: "missing", status: "CAPTURED", eventKey: "evt-missing" });
    expect(wrong.status).toBe(400);
    const checkout = await request(app.getHttpServer())
      .post("/api/billing/checkout")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ purpose: "topup", amountHalalas: 5000, idempotencyKey: `topup-${seq}` })
      .expect(201);
    const eventKey = `evt-${checkout.body.intentId}`;
    const signature = signSandbox(kernel.config.paymentSandboxSecret, eventKey);
    const paid = await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("x-signature", signature)
      .send({ intentId: checkout.body.intentId, status: "CAPTURED", eventKey })
      .expect(201);
    expect(paid.body.status).toBe("paid");
    const replay = await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("x-signature", signature)
      .send({ intentId: checkout.body.intentId, status: "CAPTURED", eventKey });
    expect(replay.status).toBe(201);
    expect(replay.body.duplicate).toBe(true);
    const callback = await request(app.getHttpServer()).post("/api/payments/callback").send({ trandata: "not-a-payload" });
    expect(callback.status).toBeGreaterThanOrEqual(400);
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.userId } });
    expect(wallet?.balanceHalalas).toBe(5000);
  });
});
