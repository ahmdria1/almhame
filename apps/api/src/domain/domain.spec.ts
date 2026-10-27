import { readFileSync } from "fs";
import { join } from "path";
import { DEFAULT_JURISDICTION, JURISDICTION_CATALOG } from "@elawyer/types";
import { validateCitations } from "./citations";
import { composeDraft, readSlots } from "./draft";
import { EMBED_DIM, mockEmbed, vectorLiteral } from "./embeddings";
import { decodeMasterKey, decryptBytes, decryptString, encryptBytes, encryptString, generateDek, unwrapKey, wrapKey } from "./envelope";
import { halalasToSar, nextInvoiceNumber, splitVatInclusive, zatcaQrBase64 } from "./invoice";
import { createHash, createHmac } from "crypto";
import { buildTrandata, decryptTrandata, encryptTrandata } from "./alrajhi";
import { generateOtpCode, isPhone, otpMatches, hashOtp, normalizePhone } from "./otp";
import { sandboxSignatureOk, signSandbox } from "./payments";
import { chatQuota, chatsCounted, courtAllowed, memoQuota, PLAN_DEFS, resolvePlan, yearlyHalalas } from "./plans";

const master = decodeMasterKey(Buffer.from("0123456789abcdef0123456789abcdef").toString("base64"));

describe("envelope", () => {
  it("round-trips a data key and a string, and hides the plain text", () => {
    const dek = generateDek();
    const wrapped = wrapKey(dek, master);
    expect(unwrapKey(wrapped, master).equals(dek)).toBe(true);
    const secret = "فصل تعسفي دون إنذار";
    const enc = encryptString(secret, dek);
    expect(enc.includes(secret)).toBe(false);
    expect(decryptString(enc, dek)).toBe(secret);
    expect(() => decryptString(enc, generateDek())).toThrow();
  });
});

describe("otp and phone", () => {
  it("hashes codes with hmac and normalizes Saudi mobiles", () => {
    const pepper = "pepper-value";
    const hash = hashOtp("123456", pepper);
    expect(hash).toBe(createHmac("sha256", pepper).update("123456").digest("hex"));
    expect(hash).not.toBe(createHash("sha256").update(`${pepper}:123456`).digest("hex"));
    expect(otpMatches("123456", hash, pepper)).toBe(true);
    expect(otpMatches("000000", hash, pepper)).toBe(false);
    expect(normalizePhone("0551234567")).toBe("+966551234567");
  });
});

describe("plans and vat", () => {
  it("enforces free chat and memo quotas", () => {
    expect(chatQuota(PLAN_DEFS.free, 4).ok).toBe(true);
    expect(chatQuota(PLAN_DEFS.free, 5)).toEqual({ ok: false, code: "QUOTA_CHATS" });
    expect(chatsCounted(PLAN_DEFS.free, 5, 0)).toBe(5);
    expect(chatsCounted(PLAN_DEFS.basic, 5, 0)).toBe(0);
    expect(chatQuota(PLAN_DEFS.basic, chatsCounted(PLAN_DEFS.basic, 5, 0)).ok).toBe(true);
    expect(memoQuota(PLAN_DEFS.basic, 30)).toEqual({ ok: false, code: "QUOTA_MEMOS" });
    expect(PLAN_DEFS.basic.priceHalalas).toBe(9900);
    expect(PLAN_DEFS.pro.priceHalalas).toBe(24900);
    expect(PLAN_DEFS.office.priceHalalas).toBe(59900);
    expect(PLAN_DEFS.pro.word).toBe(true);
    expect(PLAN_DEFS.basic.word).toBe(false);
  });

  it("splits inclusive VAT at 15 percent", () => {
    const split = splitVatInclusive(9900);
    expect(split.subtotalHalalas + split.vatHalalas).toBe(9900);
    expect(split.vatHalalas).toBeGreaterThan(0);
    expect(halalasToSar(2900)).toBe("29.00");
  });

  it("builds a phase-one invoice qr", () => {
    const qr = zatcaQrBase64({
      sellerName: "المحامي الإلكتروني المتقدم",
      vatNumber: "300000000000003",
      timestamp: "2026-10-27T12:00:00Z",
      totalSar: "99.00",
      vatSar: "12.91",
    });
    const raw = Buffer.from(qr, "base64");
    expect(raw[0]).toBe(1);
    expect(raw.subarray(2, 2 + raw[1]).toString("utf8")).toContain("المحامي");
  });
});

describe("citations", () => {
  const known = {
    articles: new Map([["a77", { number: "77" }]]),
    sharia: new Set(["s1"]),
  };

  it("accepts only retrieved records", () => {
    const text = "المادة (77) من العيّنة\n{{cite:article:a77}}\n{{cite:sharia:s1}}";
    expect(
      validateCitations(text, [
        { kind: "article", id: "a77", number: "77" },
        { kind: "sharia", id: "s1" },
      ], known).ok,
    ).toBe(true);
  });

  it("rejects an article number that is not in the corpus link set", () => {
    const result = validateCitations("المادة (999) تخالف القاعدة", [{ kind: "article", id: "a77", number: "77" }], known);
    expect(result.ok).toBe(false);
    expect(result.unknown).toContain("article:999");
  });

  it("rejects an unknown citation id", () => {
    const result = validateCitations("نص", [{ kind: "article", id: "missing", number: "1" }], known);
    expect(result.ok).toBe(false);
  });
});

describe("draft composer", () => {
  it("quotes only the articles it was given", () => {
    const slots = readSlots(["المدعي: أحمد\nالمدعى عليه: الشركة\nالطلبات: التعويض\nانتهت العلاقة بعد سنوات دون إنذار كتابي ولم تُصرف المكافأة."]);
    expect(slots.ready).toBe(true);
    const draft = composeDraft({
      court: "labor",
      memoType: "lawsuit",
      slots,
      articles: [
        {
          id: "a77",
          number: "77",
          textAr: "نص عيّنة غير رسمي عن إنهاء العقد.",
          textEn: "sample",
          lawNameAr: "عيّنة نظام العمل",
          lawNameEn: "Sample labor",
          sourceUrl: "https://example.sa/sample/77",
          isSample: true,
          version: "sample-1",
          effectiveDate: "2026-01-01",
        },
      ],
      sharia: [],
    });
    expect(draft.body).toContain("المادة (77)");
    expect(draft.body).not.toMatch(/المادة\s*\(?\s*84/);
    expect(draft.citations).toEqual([{ kind: "article", id: "a77", number: "77" }]);
  });
});

describe("embeddings and payment crypto", () => {
  it("returns a stable unit vector", () => {
    const a = mockEmbed("مكافأة نهاية الخدمة");
    const b = mockEmbed("مكافأة نهاية الخدمة");
    expect(a).toHaveLength(EMBED_DIM);
    expect(a).toEqual(b);
    const norm = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("round-trips tranportal data and sandbox signatures", () => {
    const key = "1234567890abcdef";
    const json = buildTrandata({
      tranportalId: "merchant",
      password: "secret",
      amountSar: "99.00",
      trackId: "track-1",
      responseUrl: "https://example.sa/ok",
      errorUrl: "https://example.sa/err",
    });
    expect(JSON.parse(json)[0].currencyCode).toBe(JURISDICTION_CATALOG.SA.numericCurrency);
    expect(decryptTrandata(encryptTrandata(json, key), key)).toBe(json);
    const sig = signSandbox("sandbox", "intent-1");
    expect(sandboxSignatureOk("sandbox", "intent-1", sig)).toBe(true);
    expect(sandboxSignatureOk("sandbox", "intent-1", "00")).toBe(false);
    expect(vectorLiteral(mockEmbed("نص"))).toMatch(/^\[[0-9.,-]+\]$/);
    expect(() => vectorLiteral([1])).toThrow(/dimension/);
    expect(() => encryptTrandata("{}", "short")).toThrow(/16 or 32/);
  });
});

describe("remaining domain branches", () => {
  it("covers phone, plan, invoice, and envelope edges", () => {
    expect(generateOtpCode()).toMatch(/^\d{6}$/);
    expect(isPhone("+966551234567")).toBe(true);
    expect(isPhone("055")).toBe(false);
    expect(normalizePhone("+966551234567")).toBe("+966551234567");
    expect(normalizePhone("00966551234567")).toBe("+966551234567");
    expect(normalizePhone("551234567")).toBe("+966551234567");
    expect(normalizePhone("966551234567")).toBe("+966551234567");
    expect(normalizePhone("12345")).toBe("+12345");
    expect(otpMatches("123456", "abcd", "pepper-value")).toBe(false);
    expect(yearlyHalalas(9900)).toBe(118800);
    const overridden = resolvePlan("basic", { priceHalalas: 1000, memoLimit: 2, chatLimit: 3 });
    expect(overridden.priceHalalas).toBe(1000);
    expect(resolvePlan("pro", null).code).toBe("pro");
    expect(overridden.jurisdiction).toBe(DEFAULT_JURISDICTION);
    expect(overridden.currency).toBe(JURISDICTION_CATALOG.SA.currency);
    expect(courtAllowed(PLAN_DEFS.free, "labor")).toBe(true);
    expect(courtAllowed(PLAN_DEFS.free, "commercial")).toBe(false);
    expect(chatQuota(PLAN_DEFS.pro, 40).ok).toBe(true);
    expect(memoQuota(PLAN_DEFS.free, 0).ok).toBe(true);
    expect(() => splitVatInclusive(1.5)).toThrow(/halalas/);
    expect(nextInvoiceNumber(2026, 12)).toBe("ELW-2026-000012");
    expect(() =>
      zatcaQrBase64({
        sellerName: "س".repeat(300),
        vatNumber: "1",
        timestamp: "t",
        totalSar: "1.00",
        vatSar: "0.15",
      }),
    ).toThrow(/too long/);
    expect(() => decodeMasterKey(Buffer.from("short").toString("base64"))).toThrow(/32 bytes/);
    expect(() => unwrapKey("bad", master)).toThrow(/wrapped key/);
    expect(() => decryptString("bad", generateDek())).toThrow(/payload/);
    const dek = generateDek();
    const blob = encryptBytes(Buffer.from("ملف"), dek);
    expect(decryptBytes(blob, dek).toString("utf8")).toBe("ملف");
    expect(() => decryptBytes(Buffer.from("no"), dek)).toThrow(/bad file/);
  });

  it("rejects a mismatched article number and an unknown token", () => {
    const known = {
      articles: new Map([["a77", { number: "77" }]]),
      sharia: new Set(["s1"]),
    };
    const mismatch = validateCitations("نص", [{ kind: "article", id: "a77", number: "1" }], known);
    expect(mismatch.ok).toBe(false);
    expect(mismatch.unknown).toContain("mismatch:a77");
    const token = validateCitations("{{cite:sharia:missing}}", [], known);
    expect(token.unknown).toContain("token:missing");
  });

  it("asks for missing facts and still drafts without a retrieved article", () => {
    expect(readSlots(["قصير"]).ready).toBe(false);
    const noPlaintiff = readSlots(["هذه وقائع طويلة تكفي لوصف النزاع دون ذكر الأطراف بالاسم."]);
    expect(noPlaintiff.ready).toBe(false);
    const noDefendant = readSlots(["المدعي: أحمد\nهذه وقائع طويلة تكفي لوصف النزاع دون ذكر الطرف الآخر."]);
    expect(noDefendant.ready).toBe(false);
    const slots = readSlots(["المدعي: أحمد\nالمدعى عليه: الشركة\nالطلبات: التعويض\nانتهت العلاقة بعد سنوات دون إنذار كتابي ولم تُصرف المكافأة."]);
    const draft = composeDraft({
      court: "general",
      memoType: "defense",
      slots,
      articles: [],
      sharia: [
        {
          id: "s1",
          kind: "quran",
          reference: "2:282",
          textAr: "يَا أَيُّهَا الَّذِينَ آمَنُوا",
          textEn: "quran",
          sourceUrl: "https://tanzil.net/download/",
          isSample: false,
        },
      ],
      letterhead: "مكتب أحمد العمراني",
    });
    expect(draft.title).toBe("مذكرة دفاع");
    expect(draft.body).toContain("لم يُسترجع من المدونة");
    expect(draft.body).toContain("2:282");
    expect(draft.body).toContain("مكتب أحمد العمراني");
    expect(draft.citations).toEqual([{ kind: "sharia", id: "s1" }]);
  });
});

describe("jurisdiction catalog", () => {
  it("keeps countries as data and Arabic SEO on the generic locale", () => {
    const schema = readFileSync(join(__dirname, "../../prisma/schema.prisma"), "utf8");
    const metadata = readFileSync(join(__dirname, "../../../web/src/seo/metadata.ts"), "utf8");
    expect(schema).toContain("model Jurisdiction");
    expect(schema).toContain("model Court");
    expect(schema).toContain("model DocumentTemplate");
    expect(schema).not.toMatch(/enum\s+CourtType/);
    expect(schema).not.toMatch(/enum\s+Jurisdiction/);
    expect(schema).toContain("@@id([jurisdiction, code])");
    expect(schema).toContain("@@id([jurisdiction, memoType])");
    expect(Object.keys(JURISDICTION_CATALOG)).toEqual([DEFAULT_JURISDICTION]);
    expect(metadata).toContain('ar: "ar"');
    expect(metadata).not.toContain("ar_SA");
  });
});
