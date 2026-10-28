import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { createServer, type Server } from "net";
import { tmpdir } from "os";
import path from "path";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createApp } from "../src/main";
import { AuthService } from "../src/auth.service";
import { CorpusService } from "../src/corpus.service";
import { PrismaService } from "../src/prisma.service";
import { pingScanner } from "../src/domain/clamd";
import { signSandbox } from "../src/domain/payments";

describe("api integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let scanner: Server | null = null;
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
    const host = process.env.CLAMAV_HOST || "127.0.0.1";
    const port = Number(process.env.CLAMAV_PORT || 3310);
    const live = await pingScanner({ host, port, timeoutMs: 300 });
    if (live) {
      process.env.CLAMAV_HOST = host;
      process.env.CLAMAV_PORT = String(port);
    } else {
      scanner = createServer((socket) => {
        const chunks: Buffer[] = [];
        socket.on("data", (chunk) => {
          chunks.push(chunk);
          const body = Buffer.concat(chunks);
          if (body.length < 14 || !body.subarray(body.length - 4).equals(Buffer.alloc(4))) return;
          const infected = body.toString("latin1").includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE");
          socket.end(Buffer.from(infected ? "stream: Eicar-Test-Signature FOUND\0" : "stream: OK\0"));
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
    const law = await prisma.law.upsert({
      where: { jurisdiction_key: { jurisdiction: "SA", key: "test-fixture-labor" } },
      create: {
        jurisdiction: "SA",
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
    scanner?.close();
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

  it("states that the labor statute is missing and rejects an invented article", async () => {
    const user = await account();
    const chat = await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ court: "labor", memoType: "lawsuit" })
      .expect(201);
    const told = await request(app.getHttpServer())
      .post(`/api/chats/${chat.body.chat.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        text: "المدعي: أحمد العمراني\nالمدعى عليه: شركة الأفق للمقاولات الطلبات: أجر شهر أغسطس\nيطالب بأجر شهر أغسطس الذي لم يصرف بعد انتهاء الخدمة لدى الشركة.",
      })
      .expect(201);
    expect(told.body.counsel.content).toContain("نظام العمل غير موجود في قاعدة النصوص الموثقة بعد");
    expect(told.body.readyToDraft).toBe(true);
    const drafted = await request(app.getHttpServer())
      .post(`/api/chats/${chat.body.chat.id}/draft`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({})
      .expect(201);
    const memo = drafted.body.memo;
    expect(memo.citations).toEqual([]);
    expect(memo.body).toContain("ثانيًا:");
    expect(memo.body).toContain("نظام العمل غير موجود في قاعدة النصوص الموثقة بعد، ولم يُضف سند نظامي.");
    expect(memo.body).not.toMatch(/\{\{cite:/);
    expect(memo.body).toContain("المدّعى عليه: شركة الأفق للمقاولات");
    expect(memo.body).not.toContain("المدّعى عليه: شركة الأفق للمقاولات الطلبات");
    const rejected = await request(app.getHttpServer())
      .patch(`/api/memos/${memo.id}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ body: `${memo.body}\nالمادة (999)` })
      .expect(422);
    expect(rejected.body.error.code).toBe("CITATION_REJECTED");
    const wrongNumber = await request(app.getHttpServer())
      .patch(`/api/memos/${memo.id}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ body: `${memo.body}\nالمادة (99998)` })
      .expect(422);
    expect(wrongNumber.body.error.code).toBe("CITATION_REJECTED");
    const otherStatute = await request(app.getHttpServer())
      .patch(`/api/memos/${memo.id}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ body: `${memo.body}\nالمادة (1) من نظام لا يخص هذه المادة: نص` })
      .expect(422);
    expect(otherStatute.body.error.code).toBe("CITATION_REJECTED");
    const badHash = await request(app.getHttpServer())
      .patch(`/api/memos/${memo.id}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ body: `${memo.body}\n{{cite:article:missing:${"ab".repeat(32)}}}` })
      .expect(422);
    expect(badHash.body.error.code).toBe("CITATION_REJECTED");
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
    await prisma.planSetting.update({ where: { jurisdiction_code: { jurisdiction: "SA", code: "basic" } }, data: { chatLimit: 1 } });
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
      await prisma.planSetting.update({ where: { jurisdiction_code: { jurisdiction: "SA", code: "basic" } }, data: { chatLimit: null } });
    }
  });

  it("cites labor law articles for a wage claim and rejects an unknown article", async () => {
    const labor = JSON.parse(readFileSync(path.join(__dirname, "../../../corpus/official/boe/labor.json"), "utf8"));
    labor.isSample = false;
    labor.articles = labor.articles.map((article: { textEn?: string }) => ({ ...article, isSample: false, textEn: article.textEn || "" }));
    await app.get(CorpusService).importRecords({ laws: [labor], sharia: [], confirmOfficial: true });
    const user = await account();
    const chat = await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ court: "labor", memoType: "lawsuit" })
      .expect(201);
    const told = await request(app.getHttpServer())
      .post(`/api/chats/${chat.body.chat.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        text: "المدعي: خالد بن سامي\nالمدعى عليه: شركة أفق للمقاولات الطلبات: أجر شهر أغسطس ومكافأة نهاية الخدمة\nانتهت خدمة العامل وجب على صاحب العمل دفع أجره وتصفية حقوقه خلال أسبوع، ولم يُصرف أجر شهر أغسطس ولا مكافأة نهاية الخدمة.",
      })
      .expect(201);
    expect(told.body.counsel.content).not.toContain("نظام العمل غير موجود في قاعدة النصوص الموثقة بعد");
    const drafted = await request(app.getHttpServer())
      .post(`/api/chats/${chat.body.chat.id}/draft`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({})
      .expect(201);
    expect(drafted.body.memo.body).toContain("من نظام العمل");
    expect(drafted.body.memo.body).not.toContain("غير موجود في قاعدة النصوص الموثقة بعد");
    expect(drafted.body.memo.citations.length).toBeGreaterThan(0);
    const rejected = await request(app.getHttpServer())
      .patch(`/api/memos/${drafted.body.memo.id}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ body: `${drafted.body.memo.body}\nالمادة (99999)` })
      .expect(422);
    expect(rejected.body.error.code).toBe("CITATION_REJECTED");
  });

  it("cites the narcotics and bribery statutes and rejects an unknown article", async () => {
    const corpus = app.get(CorpusService);
    for (const key of ["narcotics", "bribery"]) {
      const law = JSON.parse(readFileSync(path.join(__dirname, "../../../corpus/official/boe", `${key}.json`), "utf8"));
      law.isSample = false;
      law.articles = law.articles.map((article: { textEn?: string }) => ({ ...article, isSample: false, textEn: article.textEn || "" }));
      await corpus.importRecords({ laws: [law], sharia: [], confirmOfficial: true });
    }
    const user = await account();
    await prisma.user.update({ where: { id: user.userId }, data: { planCode: "basic" } });
    async function drafted(text: string) {
      const chat = await request(app.getHttpServer())
        .post("/api/chats")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ court: "criminal", memoType: "defense" })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/chats/${chat.body.chat.id}/messages`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ text })
        .expect(201);
      return request(app.getHttpServer())
        .post(`/api/chats/${chat.body.chat.id}/draft`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({})
        .expect(201);
    }
    const drug = await drafted("المدعي: النيابة العامة\nالمدعى عليه: خالد\nالطلبات: البراءة\nدفاع عن حيازة مواد مخدرة. يعاقب كل من حاز مواد مخدرة أو مؤثرات عقلية أو أحرزها أو نقلها أو سلمها أو تسلمها لغير قصد الاتجار أو الترويج أو التعاطي أو الاستعمال الشخصي.");
    expect(drug.body.memo.body).toContain("نظام مكافحة المخدرات والمؤثرات العقلية");
    expect(drug.body.memo.body).not.toContain("غير موجود في قاعدة النصوص الموثقة بعد");
    const bribe = await drafted("المدعي: النيابة العامة\nالمدعى عليه: موظف عام\nالطلبات: البراءة\nقضية رشوة. يعفى الراشي أو الوسيط من العقوبة الأصلية والتبعية إذا أخبر السلطات بالجريمة قبل اكتشافها.");
    expect(bribe.body.memo.body).toContain("نظام مكافحة الرشوة");
    const rejected = await request(app.getHttpServer())
      .patch(`/api/memos/${bribe.body.memo.id}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ body: `${bribe.body.memo.body}\nالمادة (99999)` })
      .expect(422);
    expect(rejected.body.error.code).toBe("CITATION_REJECTED");
  });

  it("rejects an infected upload, a renamed executable, and a PDF with JavaScript, and accepts a clean PDF", async () => {
    const user = await account();
    await prisma.user.update({ where: { id: user.userId }, data: { planCode: "basic" } });
    const chat = await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ court: "criminal", memoType: "defense" })
      .expect(201);
    const detail = await request(app.getHttpServer()).get(`/api/chats/${chat.body.chat.id}`).set("Authorization", `Bearer ${user.token}`).expect(200);
    const caseId = detail.body.caseFile.id as string;
    const eicar = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    const infected = await request(app.getHttpServer())
      .post(`/api/cases/${caseId}/documents`)
      .set("Authorization", `Bearer ${user.token}`)
      .attach("file", eicar, { filename: "eicar.pdf", contentType: "application/pdf" });
    expect(infected.status).toBe(422);
    expect(infected.body.error.code).toBe("FILE_INFECTED");
    const audit = await prisma.auditLog.findFirst({ where: { actorId: user.userId, action: "upload.rejected FILE_INFECTED" } });
    expect(audit).toBeTruthy();
    expect(JSON.stringify(audit)).not.toContain("EICAR");
    const exe = await request(app.getHttpServer())
      .post(`/api/cases/${caseId}/documents`)
      .set("Authorization", `Bearer ${user.token}`)
      .attach("file", Buffer.from("MZ\x90\x00not-an-image"), { filename: "photo.png", contentType: "image/png" });
    expect(exe.status).toBe(422);
    expect(exe.body.error.code).toBe("UNSUPPORTED_TYPE");
    const script = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
    const unsafe = await request(app.getHttpServer())
      .post(`/api/cases/${caseId}/documents`)
      .set("Authorization", `Bearer ${user.token}`)
      .attach("file", script, { filename: "memo.pdf", contentType: "application/pdf" });
    expect(unsafe.status).toBe(422);
    expect(unsafe.body.error.code).toBe("PDF_UNSAFE");
    const clean = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
    const accepted = await request(app.getHttpServer())
      .post(`/api/cases/${caseId}/documents`)
      .set("Authorization", `Bearer ${user.token}`)
      .attach("file", clean, { filename: "../../عقد.pdf", contentType: "application/pdf" })
      .expect(201);
    expect(accepted.body.filename).toBe("عقد.pdf");
    const downloaded = await request(app.getHttpServer())
      .get(`/api/documents/${accepted.body.id}/download`)
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);
    expect(downloaded.headers["x-content-type-options"]).toBe("nosniff");
    expect(String(downloaded.headers["content-disposition"])).toContain("attachment");
    expect(String(downloaded.headers["content-security-policy"])).toContain("default-src 'none'");
  });

  it("deletes the account and the data that belongs to it", async () => {
    const user = await account();
    const chat = await request(app.getHttpServer())
      .post("/api/chats")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ court: "labor", memoType: "lawsuit" })
      .expect(201);
    const removed = await request(app.getHttpServer())
      .delete("/api/me")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ confirm: true })
      .expect(200);
    expect(removed.body.deleted).toBe(true);
    expect(await prisma.user.findUnique({ where: { id: user.userId } })).toBeNull();
    expect(await prisma.chat.count({ where: { id: chat.body.chat.id } })).toBe(0);
    await request(app.getHttpServer()).get("/api/me").set("Authorization", `Bearer ${user.token}`).expect(404);
  });
});
