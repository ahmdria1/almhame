import { readFileSync } from "fs";
import { join } from "path";
import {
  CACHED_SYSTEM_PREFIX,
  clearGenericCache,
  estimateTokens,
  looksUserSpecific,
  readGeneric,
  routeModel,
  shapeCostReport,
  summarizeOlderTurns,
  writeGeneric,
} from "./model-route";

const turns = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ role: "user" as const, text: `turn ${index} وقائع مختصرة` }));

describe("model routing", () => {
  beforeEach(() => clearGenericCache());

  it("estimates tokens from trimmed length", () => {
    expect(estimateTokens("  ")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });

  it("keeps a short thread and shortens older turns", () => {
    expect(summarizeOlderTurns(turns(2), 4)).toHaveLength(2);
    const shortened = summarizeOlderTurns(turns(6), 2);
    expect(shortened).toHaveLength(3);
    expect(shortened[0].text.startsWith("Earlier turns, shortened:")).toBe(true);
    const blank = summarizeOlderTurns(
      [
        { role: "user", text: "   " },
        { role: "user", text: "" },
        { role: "assistant", text: "جواب" },
      ],
      0,
    );
    expect(blank[0].text).toBe("Earlier turns were empty.");
    expect(blank).toHaveLength(2);
  });

  it("uses the stronger model for drafts and the cheaper model after the budget", () => {
    const under = routeModel({
      purpose: "draft",
      plan: "pro",
      usedTokens: 10,
      turns: turns(1),
      articleCount: 6,
      chatModel: "chat-model",
      draftModel: "draft-model",
    });
    expect(under.model).toBe("draft-model");
    expect(under.degraded).toBe(false);
    expect(under.articleLimit).toBe(4);
    expect(under.prefix).toBe(CACHED_SYSTEM_PREFIX);
    const chat = routeModel({
      purpose: "chat",
      plan: "basic",
      usedTokens: 1000,
      turns: turns(1),
      articleCount: 3,
      chatModel: "chat-model",
      draftModel: "draft-model",
    });
    expect(chat.model).toBe("chat-model");
    expect(chat.articleLimit).toBe(3);
    const tight = routeModel({
      purpose: "draft",
      plan: "free",
      usedTokens: 16000,
      turns: turns(10),
      articleCount: 5,
      chatModel: "chat-model",
      draftModel: "draft-model",
    });
    expect(tight.degraded).toBe(false);
    expect(tight.model).toBe("draft-model");
    expect(tight.articleLimit).toBe(2);
    expect(tight.turns.length).toBeLessThanOrEqual(5);
    const over = routeModel({
      purpose: "draft",
      plan: "free",
      usedTokens: 20000,
      turns: turns(9),
      articleCount: 5,
      chatModel: "chat-model",
      draftModel: "draft-model",
    });
    expect(over.degraded).toBe(true);
    expect(over.model).toBe("chat-model");
    expect(over.articleLimit).toBe(1);
    expect(over.prefix).toBe(under.prefix);
    expect(over.prefix.includes("turn 0")).toBe(false);
    const unknown = routeModel({
      purpose: "chat",
      plan: "unknown" as "free",
      usedTokens: 1,
      turns: [],
      articleCount: -2,
      chatModel: "chat-model",
      draftModel: "draft-model",
    });
    expect(unknown.articleLimit).toBe(0);
    expect(unknown.model).toBe("chat-model");
  });

  it("caches only a generic answer", () => {
    expect(looksUserSpecific("من المدّعي؟ أجب بالصيغة: المدّعي: الاسم.")).toBe(false);
    expect(looksUserSpecific("المدّعي: شركة النور")).toBe(true);
    expect(looksUserSpecific("المدّعى عليه: خالد")).toBe(true);
    expect(looksUserSpecific("user@example.com")).toBe(true);
    expect(looksUserSpecific("رقم 1234567")).toBe(true);
    expect(looksUserSpecific("س".repeat(241))).toBe(true);
    expect(writeGeneric("facts", "صف الوقائع بجملة واضحة.")).toBe(true);
    expect(readGeneric("facts")).toBe("صف الوقائع بجملة واضحة.");
    expect(writeGeneric("facts", "المدّعي: شركة النور")).toBe(false);
    expect(readGeneric("facts")).toBe("صف الوقائع بجملة واضحة.");
    expect(writeGeneric("", "عام")).toBe(false);
    expect(writeGeneric("user@example.com", "عام")).toBe(false);
    expect(readGeneric("missing")).toBeNull();
  });

  it("shapes totals without carrying text", () => {
    const report = shapeCostReport([
      { planCode: "free", purpose: "chat", degraded: false, cached: true, tokens: 10, count: 2 },
      { planCode: "pro", purpose: "draft", degraded: true, cached: false, tokens: 30, count: 1 },
    ]);
    expect(report.totals).toEqual({ tokens: 40, requests: 3, degraded: 1, cached: 2 });
    expect(report.byPlan).toEqual({ free: 10, pro: 30 });
    expect(report.byPurpose).toEqual({ chat: 10, draft: 30 });
    expect(JSON.stringify(report)).not.toMatch(/content|body|title/);
  });

  it("keeps the admin cost query on aggregates", () => {
    const source = readFileSync(join(__dirname, "../admin.service.ts"), "utf8");
    const start = source.indexOf("async costs(");
    const end = source.indexOf("settings()", start);
    const body = source.slice(start, end);
    expect(body).toContain("groupBy");
    expect(body).not.toMatch(/contentEnc|bodyEnc|titleEnc|notesEnc|ocrEnc/);
    expect(body).not.toContain("userId");
  });
});
