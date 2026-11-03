import { readFileSync } from "fs";
import { join } from "path";
import { HttpException } from "@nestjs/common";
import { citationLabel } from "./domain/article-numbers";
import { WorkService } from "./work.service";

const labor = JSON.parse(readFileSync(join(__dirname, "../../../corpus/official/boe/labor.json"), "utf8")) as {
  nameAr: string;
  nameEn: string;
  version: string;
  articles: { number: string; textAr: string; sourceUrl: string }[];
};

function stored(label: string, id: string) {
  const row = labor.articles.find((item) => citationLabel(item.number) === label);
  if (!row) throw new Error(`missing labor ${label}`);
  return {
    id,
    number: row.number,
    textAr: row.textAr,
    textEn: "",
    lawNameAr: labor.nameAr,
    lawNameEn: labor.nameEn,
    sourceUrl: row.sourceUrl,
    isSample: false,
    version: labor.version,
    effectiveDate: "2005-09-27",
  };
}

const userText = [
  "المدّعي: خالد بن سامي",
  "المدّعى عليه: شركة أفق",
  "الطلبات: إلزام المدّعى عليه بأجر شهر أغسطس.",
  "الوقائع: يعمل خالد بن سامي لدى شركة أفق منذ ثلاث سنوات، وأنهى صاحب العمل العقد في أغسطس 2023 لسبب غير مشروع ودون إنذار، ولم يُصرف أجر شهر أغسطس.",
].join("\n");

function harness(articlesKnown: boolean) {
  const articles = [stored("77", "labor-77"), stored("88", "labor-88")];
  let savedBody = "";
  let transactions = 0;
  const memoRow = () => ({
    id: "memo-1",
    titleEnc: "صحيفة دعوى",
    bodyEnc: savedBody,
    court: "labor",
    memoType: "lawsuit",
    status: "draft",
    flagged: false,
    caseId: null,
    chatId: "chat-1",
    updatedAt: new Date(),
    citations: [],
  });
  const prisma = {
    user: {
      findUnique: async () => ({ id: "user-1", planCode: "free", jurisdiction: "SA", wrappedDataKey: "key", memoCountPeriod: 0, planRenewsAt: null }),
    },
    chat: {
      findFirst: async () => ({ id: "chat-1", court: "labor", memoType: "lawsuit", jurisdiction: "SA", caseId: null, titleEnc: "t", updatedAt: new Date() }),
    },
    message: { findMany: async () => [{ contentEnc: userText }] },
    documentTemplate: {
      findUnique: async () => ({ titleAr: "صحيفة دعوى", courtHeadings: { labor: "فضيلة رئيس الدائرة العمالية بالمحكمة العمالية" } }),
    },
    organization: { findUnique: async () => null },
    tokenLedger: { aggregate: async () => ({ _sum: { tokens: 0 } }), create: async () => ({}) },
    article: {
      findMany: async () => (articlesKnown ? articles.map((item) => ({ id: item.id, number: item.number, textAr: item.textAr, law: { nameAr: labor.nameAr } })) : []),
    },
    shariaSource: { findMany: async () => [] },
    judgment: { findMany: async () => [] },
    draftCheckFailure: { create: async () => ({ id: "check-1" }) },
    memo: {
      create: async (input: { data: { bodyEnc: string; titleEnc: string } }) => {
        savedBody = input.data.bodyEnc;
        return memoRow();
      },
      findFirst: async () => memoRow(),
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => {
      transactions += 1;
      return run({
        user: {
          findUnique: async () => ({ id: "user-1", planCode: "free", memoCountPeriod: 0, jurisdiction: "SA" }),
          update: async () => ({}),
        },
        memo: {
          create: async (input: { data: { bodyEnc: string; titleEnc: string } }) => {
            savedBody = input.data.bodyEnc;
            return memoRow();
          },
        },
      });
    },
  };
  const kernel = {
    prisma,
    config: {
      llmProvider: "remote",
      modelBaseUrl: "http://127.0.0.1:9",
      modelApiKey: "test-key",
      chatModel: "chat-model",
      draftModel: "draft-model",
      verifierModel: "",
    },
    dekOf: () => Buffer.alloc(32),
    dec: (_dek: Buffer, value: string) => value,
    enc: (_dek: Buffer, value: string) => value,
    plan: async () => ({ memoLimit: 5, letterhead: false }),
  };
  const corpus = {
    retrieve: async () => ({ substantive: articles, procedural: [], sharia: [], judgments: [], notice: null }),
  };
  const service = new WorkService(
    kernel as never,
    corpus as never,
    {} as never,
    {} as never,
    { index: async () => undefined } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return {
    service,
    saved: () => savedBody,
    transactions: () => transactions,
  };
}

describe("draft attempts", () => {
  const realTimeout = AbortSignal.timeout;
  let draftCalls = 0;

  beforeEach(() => {
    draftCalls = 0;
    jest.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds: number) => {
      expect(milliseconds).toBe(20000);
      return realTimeout.call(AbortSignal, 1);
    });
    global.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
      const content = JSON.parse(String(init?.body)).messages.map((message: { content: string }) => message.content).join("\n");
      if (content.includes("Rewrite the facts")) {
        return { ok: true, json: async () => ({ choices: [{ message: { content: "{\"facts\":\"يعمل خالد بن سامي لدى شركة أفق منذ ثلاث سنوات، وأنهى صاحب العمل العقد في أغسطس 2023 لسبب غير مشروع ودون إنذار، ولم يُصرف أجر شهر أغسطس.\"}" } }] }) };
      }
      draftCalls += 1;
      if (draftCalls === 1) throw new Error("aborted");
      return { ok: true, json: async () => ({ choices: [{ message: { content: "بصفتي نموذج أكتب المذكرة." } }] }) };
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("stops after two model attempts and saves the fallback", async () => {
    const { service, saved, transactions } = harness(true);
    const memo = await service.draft("user-1", "chat-1", false);
    expect(draftCalls).toBe(2);
    expect(AbortSignal.timeout).toHaveBeenCalledTimes(2);
    expect(transactions()).toBe(1);
    expect(saved()).toContain("يرتب للطرف المتضرر التعويض");
    expect(saved()).toContain("خلال أسبوع");
    expect(saved()).not.toContain("بصفتي نموذج");
    expect(memo.body).toBe(saved());
  });

  it("returns DRAFT_RETRY and saves nothing when the fallback is not valid", async () => {
    const { service, transactions } = harness(false);
    try {
      await service.draft("user-1", "chat-1", false);
      throw new Error("draft should have failed");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const http = error as HttpException;
      expect(http.getStatus()).toBe(503);
      expect(http.getResponse()).toMatchObject({ code: "DRAFT_RETRY" });
    }
    expect(draftCalls).toBe(2);
    expect(transactions()).toBe(0);
  });
});
