import { readFileSync } from "fs";
import { join } from "path";
import { LOCALES, noticeCue, shouldPlayNotice, soundTier } from "@elawyer/types";
import { buildAssessment, successBand } from "./assessment";
import { clientCopy } from "./client-copy";
import { asLocale, detectClientLanguage, scriptOf } from "./client-lang";
import { pagesAllowed, turnsAllowed, withinDailyCap } from "./fair-use";
import { arabicFacts, hasDate, MEMO_DISCLAIMER, preservedTokens } from "./facts";
import { buildHearingPrep, plainSummary } from "./hearing-prep";
import { lawyerCheckerFrom, MockLawyerChecker, nationalIdShape, NajizLawyerChecker } from "./lawyer-check";
import { draftingSystemPrompt } from "./prompts";

const SAMPLES = {
  bn: "আমার নাম রহিম। কোম্পানি 15000 টাকা দেয়নি। তারিখ 2024-03-12।",
  ur: "میرا نام عمران ہے۔ کمپنی نے 15000 ریال نہیں دیا۔ تاریخ 2024-03-12۔",
  hi: "मेरा नाम रहीम है। कंपनी ने 15000 रियाल नहीं दिया। तारीख 2024-03-12।",
  tr: "Adım Rahim. Şirket 15000 riyal ödemedi. Tarih 2024-03-12.",
  en: "My name is Rahim. The company did not pay 15000 riyals. Date 2024-03-12.",
};

describe("client language", () => {
  it("detects the client's script and keeps a locale hint for Devanagari", () => {
    expect(detectClientLanguage(SAMPLES.bn, "ar")).toBe("bn");
    expect(detectClientLanguage(SAMPLES.ur, "ar")).toBe("ur");
    expect(detectClientLanguage(SAMPLES.hi, "ar")).toBe("hi");
    expect(detectClientLanguage("मेरो नाम", "ne")).toBe("ne");
    expect(detectClientLanguage(SAMPLES.tr, "en")).toBe("tr");
    expect(detectClientLanguage(SAMPLES.en, "ar")).toBe("en");
    expect(detectClientLanguage("Hello", "fil")).toBe("fil");
    expect(detectClientLanguage("وقائع أجر لم يصرف", "en")).toBe("ar");
    expect(asLocale("nope")).toBe("ar");
  });

  it("keeps names, dates, and amounts exactly inside an Arabic framing", () => {
    for (const sample of Object.values(SAMPLES)) {
      const facts = arabicFacts(sample);
      expect(facts).toContain("أفاد صاحب الشأن");
      expect(facts).toContain("15000");
      expect(facts).toContain("2024-03-12");
      const tokens = preservedTokens(sample);
      for (const token of tokens) expect(facts).toContain(token);
    }
    expect(hasDate(SAMPLES.en)).toBe(true);
    expect(preservedTokens(SAMPLES.bn)).toContain("রহিম");
    expect(preservedTokens(SAMPLES.ur)).toContain("عمران");
    expect(preservedTokens(SAMPLES.hi)).toContain("रहीम");
    expect(preservedTokens(SAMPLES.tr)).toContain("Rahim");
  });
});

describe("assessment and hearing prep", () => {
  it("states a bounded estimate, blunt weaknesses, and a disclaimer in the client language", () => {
    for (const [locale, sample] of Object.entries(SAMPLES)) {
      const result = buildAssessment(sample, locale as "en");
      expect(result.successLow).toBeLessThan(result.successHigh);
      expect(result.successLow).toBeGreaterThanOrEqual(15);
      expect(result.successHigh).toBeLessThanOrEqual(85);
      expect(result.weaknesses.length).toBeGreaterThan(0);
      expect(result.disclaimer).toBe(clientCopy(locale as "en").disclaimer);
      expect(result.recommendedPath).toMatch(scriptOf(locale as "en"));
      expect(result.reasons.join(" ")).toMatch(scriptOf(locale as "en"));
    }
    const bare = successBand("كلام بلا تاريخ ولا مبلغ");
    expect(bare.dated).toBe(false);
    expect(bare.low).toBeLessThan(successBand(SAMPLES.en).low);
  });

  it("keeps court questions in Arabic and answers in both languages", () => {
    const prep = buildHearingPrep("lawsuit", "bn");
    expect(prep.items).toHaveLength(3);
    expect(prep.items[0].questionAr).toMatch(/[\u0600-\u06FF]/);
    expect(prep.items[0].questionClient).toMatch(/[\u0980-\u09FF]/);
    expect(prep.items[0].answerAr).toMatch(/[\u0600-\u06FF]/);
    expect(prep.items[0].answerClient).toMatch(/[\u0980-\u09FF]/);
    expect(prep.interpreterTipClient).toMatch(/[\u0980-\u09FF]/);
    expect(prep.disclaimer).toBe(MEMO_DISCLAIMER);
    const summary = plainSummary("tr", ["Rahim", "15000", "2024-03-12"]);
    expect(summary.notice.length).toBeGreaterThan(10);
    expect(summary.text).toContain("15000");
    expect(summary.text).toContain("Rahim");
  });

  it("covers every locale pack", () => {
    for (const locale of LOCALES) {
      const copy = clientCopy(locale);
      expect(copy.ready.length).toBeGreaterThan(8);
      expect(copy.questions).toHaveLength(3);
      expect(copy.planExpiry).not.toMatch(/TODO/);
    }
  });
});

describe("lawyer check and fair use", () => {
  it("uses the mock list when Najiz credentials are absent and calls Najiz when they are set", async () => {
    expect(nationalIdShape("1098765432")).toBe(true);
    expect(nationalIdShape("123")).toBe(false);
    const mock = lawyerCheckerFrom({
      baseUrl: "",
      clientId: "",
      clientSecret: "",
      tokenPath: "",
      licensePath: "",
      mockBlockIds: ["1098765432"],
    });
    expect(mock).toBeInstanceOf(MockLawyerChecker);
    await expect(mock.check({ name: "أ", phone: "1", email: "a@b.c", nationalId: "1098765432" })).resolves.toEqual({
      practicingLawyer: true,
      source: "mock",
    });
    await expect(mock.check({ name: "أ", phone: "1", email: "a@b.c" })).resolves.toEqual({
      practicingLawyer: false,
      source: "mock",
    });
    expect(() =>
      lawyerCheckerFrom({
        baseUrl: "",
        clientId: "",
        clientSecret: "",
        tokenPath: "",
        licensePath: "",
        mockBlockIds: [],
        nodeEnv: "production",
      }),
    ).toThrow(/NAJIZ_CLIENT_ID/);
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "tok" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ licenseStatus: "ساري" }), { status: 200 }));
    const live = new NajizLawyerChecker({
      baseUrl: "https://developers.najiz.sa",
      clientId: "id",
      clientSecret: "secret",
      tokenPath: "/oauth/v1/token",
      licensePath: "/lawyers/v1/licenses",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(live.check({ name: "أ", phone: "1", email: "a@b.c", nationalId: "1098765432" })).resolves.toEqual({
      practicingLawyer: true,
      source: "najiz",
    });
    await expect(live.check({ name: "أ", phone: "1", email: "a@b.c", nationalId: "12" })).resolves.toEqual({
      practicingLawyer: false,
      source: "najiz",
    });
    fetchImpl.mockResolvedValueOnce(new Response("no", { status: 401 }));
    await expect(live.check({ name: "أ", phone: "1", email: "a@b.c", nationalId: "1098765432" })).rejects.toThrow(/najiz token/);
  });

  it("enforces turns, pages, and the daily assessment cap", () => {
    expect(turnsAllowed(9, 10)).toBe(true);
    expect(turnsAllowed(10, 10)).toBe(false);
    expect(pagesAllowed(20, 11, 30)).toBe(false);
    expect(pagesAllowed(20, 10, 30)).toBe(true);
    expect(withinDailyCap(23, 24)).toBe(true);
    expect(withinDailyCap(24, 24)).toBe(false);
    expect(withinDailyCap(100, 0)).toBe(true);
  });

  it("tells the remote model to keep the memo in formal Arabic", () => {
    const prompt = draftingSystemPrompt("bn", ["12"]);
    expect(prompt).toContain("formal legal Arabic");
    expect(prompt).toContain("not a licensed lawyer");
    expect(prompt).toContain("bn");
    expect(prompt).toContain("12");
  });
});

describe("notice sounds", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();

  it("picks the free pair or the paid pair and honors the setting", () => {
    expect(soundTier("free", null)).toBe("free");
    expect(noticeCue("free", "normal")).toBe("normal-2");
    expect(noticeCue("free", "urgent")).toBe("urgent-2");
    expect(soundTier("basic", future)).toBe("paid");
    expect(soundTier("pro", future)).toBe("paid");
    expect(noticeCue("paid", "normal")).toBe("normal-1");
    expect(noticeCue("paid", "urgent")).toBe("urgent-1");
    expect(soundTier("basic", past)).toBe("free");
    expect(soundTier("pro", past)).toBe("free");
    expect(shouldPlayNotice("off", "urgent")).toBe(false);
    expect(shouldPlayNotice("urgent", "normal")).toBe(false);
    expect(shouldPlayNotice("urgent", "urgent")).toBe(true);
    expect(shouldPlayNotice("all", "normal")).toBe(true);
  });
});

describe("office migration", () => {
  it("moves existing office rows onto pro before the enum loses office", () => {
    const sql = readFileSync(join(__dirname, "../../prisma/migrations/20261030140000_individual_plans/migration.sql"), "utf8");
    const userMove = sql.indexOf("UPDATE \"User\" SET \"planCode\" = 'pro' WHERE \"planCode\" = 'office'");
    const payMove = sql.indexOf("UPDATE \"PaymentIntent\" SET \"planCode\" = 'pro' WHERE \"planCode\" = 'office'");
    const dropSetting = sql.indexOf("DELETE FROM \"PlanSetting\" WHERE \"code\" = 'office'");
    const newEnum = sql.indexOf("CREATE TYPE \"PlanCode\" AS ENUM ('free', 'basic', 'pro')");
    expect(userMove).toBeGreaterThan(-1);
    expect(payMove).toBeGreaterThan(userMove);
    expect(dropSetting).toBeGreaterThan(payMove);
    expect(newEnum).toBeGreaterThan(dropSetting);
    expect(sql).toContain("RENAME COLUMN \"planRenewsAt\" TO \"planExpiresAt\"");
    expect(sql).toContain("ADD VALUE 'appeal_deadline'");
  });
});
