import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createApp } from "../src/main";
import { AuthService } from "../src/auth.service";
import { PrismaService } from "../src/prisma.service";
import { signSandbox } from "../src/domain/payments";

describe("api integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seq = Math.floor(Date.now() % 10000000);

  function phone() {
    seq += 1;
    return `05${String(seq).padStart(8, "0")}`;
  }

  async function account(name = "أحمد العمراني") {
    const mobile = phone();
    const email = `user${seq}@example.sa`;
    const password = "test-pass-123";
    const ip = `198.51.100.${seq % 250}`;
    const signup = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .set("X-Forwarded-For", ip)
      .send({ name, phone: mobile, email, password, consent: true })
      .expect(201);
    expect(signup.body.debugCode).toMatch(/^\d{6}$/);
    const blocked = await request(app.getHttpServer()).post("/api/auth/login").set("X-Forwarded-For", ip).send({ email, password }).expect(403);
    expect(blocked.body.error.code).toBe("EMAIL_UNVERIFIED");
    const verified = await request(app.getHttpServer())
      .post("/api/auth/verify")
      .set("X-Forwarded-For", ip)
      .send({ challengeId: signup.body.challengeId, code: signup.body.debugCode })
      .expect(201);
    const setCookie = verified.headers["set-cookie"];
    const cookies = Array.isArray(setCookie) ? setCookie.join(";") : setCookie || "";
    expect(cookies).toContain("elw_access=");
    expect(cookies.toLowerCase()).toContain("httponly");
    expect(cookies.toLowerCase()).toContain("samesite=strict");
    return { token: verified.body.accessToken as string, email, mobile, password, userId: verified.body.user.id as string };
  }

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    prisma = app.get(PrismaService);
    const law = await prisma.law.upsert({
      where: { key: "test-fixture-labor" },
      create: {
        key: "test-fixture-labor",
        nameAr: "قيد اختبار",
        nameEn: "test fixture",
        sourceUrl: "https://example.sa/test-fixture",
        version: "test",
        effectiveDate: new Date("2020-01-01"),
        isSample: true,
        courts: ["labor", "general"],
      },
      update: { isSample: true },
    });
    await prisma.article.upsert({
      where: { lawId_number: { lawId: law.id, number: "اختبار-1" } },
      create: {
        lawId: law.id,
        number: "اختبار-1",
        textAr: "نص اختبار داخلي لا يُبذر في قاعدة الإنتاج.",
        textEn: "test fixture",
        sourceUrl: "https://example.sa/test-fixture#1",
        isSample: true,
      },
      update: { isSample: true },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("signs up, verifies, and keeps message text out of the database", async () => {
    const user = await account();
    const chat = await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ court: "labor", memoType: "lawsuit" })
      .expect(201);
    const secret = "وقائع خاصة لا تُخزَّن كنص مكشوف في القاعدة";
    await request(app.getHttpServer())
      .post(`/api/chats/${chat.body.chat.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ text: secret })
      .expect(201);
    const row = await prisma.message.findFirst({ where: { userId: user.userId, role: "user" } });
    expect(row?.contentEnc).toBeTruthy();
    expect(row?.contentEnc.includes(secret)).toBe(false);
    expect(row?.contentEnc.startsWith("v1.")).toBe(true);
  });

  it("hides one account from another", async () => {
    const first = await account("المدعي الأول");
    const second = await account("المدعي الثاني");
    const chat = await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${first.token}`)
      .send({ court: "labor", memoType: "defense" })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/api/chats/${chat.body.chat.id}`)
      .set("Authorization", `Bearer ${second.token}`)
      .expect(404);
  });

  it("stops the sixth free chat", async () => {
    const user = await account();
    for (let index = 0; index < 5; index += 1) {
      await request(app.getHttpServer())
        .post("/api/chats")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ court: "general", memoType: "lawsuit" })
        .expect(201);
    }
    const blocked = await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ court: "general", memoType: "lawsuit" })
      .expect(402);
    expect(blocked.body.error.code).toBe("QUOTA_CHATS");
  });

  it("drafts only from the sample corpus and rejects an invented article", async () => {
    const user = await account();
    const chat = await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ court: "labor", memoType: "lawsuit" })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/chats/${chat.body.chat.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ text: "المدعي أحمد العمراني يطالب شركة الأفق للمقاولات بأجر شهر أغسطس الذي لم يصرف بعد انتهاء الخدمة." })
      .expect(201);
    const drafted = await request(app.getHttpServer())
      .post(`/api/chats/${chat.body.chat.id}/draft`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({})
      .expect(201);
    const memo = drafted.body.memo;
    expect(memo.citations.length).toBeGreaterThan(0);
    expect(memo.citations.every((item: { isSample: boolean }) => item.isSample)).toBe(true);
    expect(memo.body).toContain("ثانيًا:");
    const rejected = await request(app.getHttpServer())
      .patch(`/api/memos/${memo.id}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ body: `${memo.body}\nالمادة (999)` })
      .expect(422);
    expect(rejected.body.error.code).toBe("CITATION_REJECTED");
    const pdf = await request(app.getHttpServer())
      .get(`/api/memos/${memo.id}/export.pdf`)
      .set("Authorization", `Bearer ${user.token}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(Buffer.isBuffer(pdf.body)).toBe(true);
    expect(pdf.body.subarray(0, 4).toString()).toBe("%PDF");
    const dir = mkdtempSync(path.join(tmpdir(), "elw-int-"));
    const file = path.join(dir, "memo.pdf");
    writeFileSync(file, pdf.body);
    const extracted = execFileSync("pdftotext", ["-enc", "UTF-8", file, "-"], { encoding: "utf8" });
    expect(extracted).toContain("صحيفة دعوى");
    expect(extracted).toContain("ثانيًا");
    await request(app.getHttpServer())
      .get(`/api/memos/${memo.id}/export.docx`)
      .set("Authorization", `Bearer ${user.token}`)
      .expect(402);
  });

  it("credits a sandbox payment once", async () => {
    const user = await account();
    const checkout = await request(app.getHttpServer())
      .post("/api/billing/checkout")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ purpose: "topup", amountHalalas: 10000, idempotencyKey: `topup-${user.userId}` })
      .expect(201);
    const sig = signSandbox("sandbox", checkout.body.intentId);
    await request(app.getHttpServer()).post("/api/payments/confirm").send({ intentId: checkout.body.intentId, sig }).expect(201);
    await request(app.getHttpServer()).post("/api/payments/confirm").send({ intentId: checkout.body.intentId, sig }).expect(201);
    const eventKey = `paid:${checkout.body.intentId}`;
    const hookSig = signSandbox("sandbox", eventKey);
    await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("x-signature", hookSig)
      .send({ intentId: checkout.body.intentId, status: "CAPTURED", eventKey })
      .expect(201);
    const wallet = await request(app.getHttpServer()).get("/api/wallet").set("Authorization", `Bearer ${user.token}`).expect(200);
    expect(wallet.body.balanceHalalas).toBe(10000);
    expect(wallet.body.invoices).toHaveLength(1);
    expect(wallet.body.invoices[0].vatHalalas).toBeGreaterThan(0);
  });

  it("gives the admin aggregate stats only", async () => {
    const user = await account();
    await prisma.otpChallenge.deleteMany({ where: { adminId: { not: null } } });
    await prisma.adminAccount.deleteMany();
    const invited = await app.get(AuthService).inviteAdmin("admin@example.sa");
    await request(app.getHttpServer())
      .post("/api/admin/activate")
      .send({ challengeId: invited.challengeId, code: invited.debugCode, password: "test-admin-pass" })
      .expect(201);
    const admin = await request(app.getHttpServer())
      .post("/api/admin/login")
      .send({ email: "admin@example.sa", password: "test-admin-pass" })
      .expect(201);
    const token = admin.body.accessToken as string;
    await request(app.getHttpServer()).get("/api/chats").set("Authorization", `Bearer ${token}`).expect(401);
    await request(app.getHttpServer()).get(`/api/admin/users/${user.userId}/messages`).set("Authorization", `Bearer ${token}`).expect(404);
    const stats = await request(app.getHttpServer()).get("/api/admin/stats").set("Authorization", `Bearer ${token}`).expect(200);
    expect(stats.body.users).toBeGreaterThan(0);
    expect(stats.body).not.toHaveProperty("messages");
    expect(stats.body).not.toHaveProperty("memosBody");
    const text = JSON.stringify(stats.body);
    expect(text.includes("contentEnc")).toBe(false);
    expect(text.includes("bodyEnc")).toBe(false);
    const distance = await prisma.$queryRaw<{ distance: number }[]>`SELECT ('[1,0,0]'::vector <=> '[0,1,0]'::vector) AS distance`;
    expect(Number(distance[0].distance)).toBeCloseTo(1, 5);
    const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE indexname = 'CorpusEmbedding_embedding_hnsw'
    `;
    expect(indexes.map((row) => row.indexname)).toContain("CorpusEmbedding_embedding_hnsw");
  });

  it("burns a code after five wrong tries and limits verify by IP", async () => {
    const mobile = phone();
    const email = `user${seq}@example.sa`;
    const signup = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .set("X-Forwarded-For", "203.0.113.10")
      .send({ name: "أحمد العمراني", phone: mobile, email, password: "test-pass-123", consent: true })
      .expect(201);
    const wrong = signup.body.debugCode === "000000" ? "111111" : "000000";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const rejected = await request(app.getHttpServer())
        .post("/api/auth/verify")
        .set("X-Forwarded-For", "203.0.113.10")
        .send({ challengeId: signup.body.challengeId, code: wrong })
        .expect(400);
      expect(rejected.body.error.code).toBe("OTP_INVALID");
    }
    const burned = await request(app.getHttpServer())
      .post("/api/auth/verify")
      .set("X-Forwarded-For", "203.0.113.11")
      .send({ challengeId: signup.body.challengeId, code: signup.body.debugCode })
      .expect(400);
    expect(burned.body.error.code).toBe("OTP_INVALID");

    const other = phone();
    const otherEmail = `user${seq}@example.sa`;
    const second = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .set("X-Forwarded-For", "203.0.113.20")
      .send({ name: "أحمد العمراني", phone: other, email: otherEmail, password: "test-pass-123", consent: true })
      .expect(201);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post("/api/auth/verify")
        .set("X-Forwarded-For", "203.0.113.20")
        .send({ challengeId: second.body.challengeId, code: "000000" })
        .expect(400);
    }
    await request(app.getHttpServer())
      .post("/api/auth/verify")
      .set("X-Forwarded-For", "203.0.113.20")
      .send({ challengeId: second.body.challengeId, code: second.body.debugCode })
      .expect(429);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post("/api/auth/reset")
        .set("X-Forwarded-For", "203.0.113.30")
        .send({ challengeId: "missing-challenge", code: "000000", password: "test-pass-123" })
        .expect(400);
    }
    await request(app.getHttpServer())
      .post("/api/auth/reset")
      .set("X-Forwarded-For", "203.0.113.30")
      .send({ challengeId: "missing-challenge", code: "000000", password: "test-pass-123" })
      .expect(429);
  });

  it("lets a paid plan chat again after the free lifetime limit, and resets on renewal", async () => {
    const user = await account();
    for (let index = 0; index < 5; index += 1) {
      await request(app.getHttpServer())
        .post("/api/chats")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ court: "general", memoType: "lawsuit" })
        .expect(201);
    }
    const blocked = await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ court: "general", memoType: "lawsuit" })
      .expect(402);
    expect(blocked.body.error.code).toBe("QUOTA_CHATS");
    const checkout = await request(app.getHttpServer())
      .post("/api/billing/checkout")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ purpose: "subscription", planCode: "basic", cycle: "monthly", idempotencyKey: `plan-${user.userId}` })
      .expect(201);
    const sig = signSandbox("sandbox", checkout.body.intentId);
    await request(app.getHttpServer()).post("/api/payments/confirm").send({ intentId: checkout.body.intentId, sig }).expect(201);
    await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ court: "general", memoType: "lawsuit" })
      .expect(201);
    const upgraded = await prisma.user.findUnique({ where: { id: user.userId } });
    expect(upgraded?.planCode).toBe("basic");
    expect(upgraded?.chatCount).toBe(6);
    expect(upgraded?.chatCountPeriod).toBe(1);
    await prisma.planSetting.update({ where: { code: "basic" }, data: { chatLimit: 1 } });
    try {
      const capped = await request(app.getHttpServer())
        .post("/api/chats")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ court: "general", memoType: "lawsuit" })
        .expect(402);
      expect(capped.body.error.code).toBe("QUOTA_CHATS");
      const renewal = await request(app.getHttpServer())
        .post("/api/billing/checkout")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ purpose: "subscription", planCode: "basic", cycle: "monthly", idempotencyKey: `renew-${user.userId}` })
        .expect(201);
      const renewSig = signSandbox("sandbox", renewal.body.intentId);
      await request(app.getHttpServer()).post("/api/payments/confirm").send({ intentId: renewal.body.intentId, sig: renewSig }).expect(201);
      await request(app.getHttpServer())
        .post("/api/chats")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ court: "general", memoType: "lawsuit" })
        .expect(201);
      const renewed = await prisma.user.findUnique({ where: { id: user.userId } });
      expect(renewed?.chatCountPeriod).toBe(1);
      expect(renewed?.chatCount).toBe(7);
    } finally {
      await prisma.planSetting.update({ where: { code: "basic" }, data: { chatLimit: null } });
    }
  });
});
