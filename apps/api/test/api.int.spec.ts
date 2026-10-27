import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createApp } from "../src/main";
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
    const signup = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({ name, phone: mobile, email, consent: true })
      .expect(201);
    expect(signup.body.debugCode).toMatch(/^\d{6}$/);
    const verified = await request(app.getHttpServer())
      .post("/api/auth/verify")
      .send({ challengeId: signup.body.challengeId, code: signup.body.debugCode })
      .expect(201);
    return { token: verified.body.accessToken as string, email, mobile, userId: verified.body.user.id as string };
  }

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    prisma = app.get(PrismaService);
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
    const admin = await request(app.getHttpServer())
      .post("/api/admin/login")
      .send({ email: "admin@example.sa", password: "AdminPass123!" })
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
  });
});
