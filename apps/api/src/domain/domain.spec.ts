import { validateCitations } from "./citations";
import { composeDraft, readSlots } from "./draft";
import { EMBED_DIM, mockEmbed } from "./embeddings";
import { decodeMasterKey, decryptString, encryptString, generateDek, unwrapKey, wrapKey } from "./envelope";
import { halalasToSar, splitVatInclusive, zatcaQrBase64 } from "./invoice";
import { otpMatches, hashOtp, normalizePhone } from "./otp";
import { buildTrandata, decryptTrandata, encryptTrandata, sandboxSignatureOk, signSandbox } from "./payments";
import { chatQuota, memoQuota, PLAN_DEFS } from "./plans";

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
  it("hashes codes and normalizes Saudi mobiles", () => {
    const hash = hashOtp("123456", "pepper");
    expect(otpMatches("123456", hash, "pepper")).toBe(true);
    expect(otpMatches("000000", hash, "pepper")).toBe(false);
    expect(normalizePhone("0551234567")).toBe("+966551234567");
  });
});

describe("plans and vat", () => {
  it("enforces free chat and memo quotas", () => {
    expect(chatQuota(PLAN_DEFS.free, 4).ok).toBe(true);
    expect(chatQuota(PLAN_DEFS.free, 5)).toEqual({ ok: false, code: "QUOTA_CHATS" });
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
    expect(decryptTrandata(encryptTrandata(json, key), key)).toBe(json);
    const sig = signSandbox("sandbox", "intent-1");
    expect(sandboxSignatureOk("sandbox", "intent-1", sig)).toBe(true);
    expect(sandboxSignatureOk("sandbox", "intent-1", "00")).toBe(false);
  });
});
