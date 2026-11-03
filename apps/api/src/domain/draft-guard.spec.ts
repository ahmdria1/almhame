import { MEMO_TYPES, type MemoType } from "@elawyer/types";
import { COURT_HEADING, MEMO_TITLE, type RetrievedArticle } from "./draft";
import { draftPrompt, findAiTell, humanMemo, reviewModelDraft, textMatchesOfficial, type DraftPacket, type SettledDraft } from "./draft-guard";
import { fontFile, renderPdf } from "../render";
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const facts = "يعمل خالد بن سامي لدى شركة أفق منذ ثلاث سنوات، وانتهت العلاقة في أغسطس 2026 دون إنذار، ولم يُصرف أجر شهر أغسطس.";
const official = "إذا انتهت علاقة العمل وجب دفع الأجر ومكافأة نهاية الخدمة خلال أسبوع.";

function packet(memoType: MemoType, extra?: Partial<DraftPacket>): DraftPacket {
  const article: RetrievedArticle = {
    id: "a77",
    number: "77",
    textAr: official,
    textEn: "",
    lawNameAr: "نظام العمل",
    lawNameEn: "",
    sourceUrl: "https://laws.boe.gov.sa/example",
    isSample: false,
    version: "1445",
    effectiveDate: "2024-02-01",
  };
  return {
    court: "labor",
    memoType,
    slots: {
      plaintiff: "خالد بن سامي",
      defendant: "شركة أفق",
      facts,
      requests: "إلزام المدّعى عليه بأجر شهر أغسطس.",
    },
    articles: [article],
    sharia: [],
    title: MEMO_TITLE[memoType],
    courtHeading: COURT_HEADING.labor,
    ...extra,
  };
}

function rejectedReason(result: { ok: true; draft: SettledDraft } | { ok: false; reason: string }): string {
  if (result.ok === false) return result.reason;
  throw new Error("expected rejection");
}

describe("draft guard", () => {
  it("replaces an altered quote with the stored text", () => {
    const source = packet("lawsuit");
    const reviewed = reviewModelDraft(
      `بسم الله الرحمن الرحيم\nصحيفة دعوى\n${COURT_HEADING.labor}\nوحيث إن المادة (77) من نظام العمل: «إذا انتهت علاقة العمل وجب دفع الأجر مع زيادة لم تذكر.»`,
      source,
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.draft.body).toContain(official);
    expect(reviewed.draft.body).not.toContain("زيادة لم تذكر");
    expect(textMatchesOfficial(official, official)).toBe(true);
  });

  it("rejects an article that was not retrieved", () => {
    const reviewed = reviewModelDraft(
      "بسم الله الرحمن الرحيم\nوحيث إن المادة (84) من نظام العمل: «نص.»",
      packet("defense"),
    );
    expect(rejectedReason(reviewed)).toContain("article:84");
  });

  it("rejects an amount that the user did not state", () => {
    const reviewed = reviewModelDraft(
      `بسم الله الرحمن الرحيم\n${facts}\nويطالب بمبلغ 50000 ريال.\nالمادة (77) من نظام العمل: «${official}»`,
      packet("reply"),
    );
    expect(rejectedReason(reviewed)).toContain("50000");
  });

  it("rejects an assistant phrase", () => {
    expect(findAiTell("بالتأكيد هذه المذكرة")).toBe("بالتأكيد");
    const reviewed = reviewModelDraft("بسم الله الرحمن الرحيم\nبصفتي نموذج أكتب لكم المذكرة.", packet("appeal", { articles: [] }));
    expect(reviewed.ok).toBe(false);
  });

  it("keeps a golden memo for each filing type", () => {
    for (const memoType of MEMO_TYPES) {
      const source = packet(memoType);
      const mocked = [
        "بسم الله الرحمن الرحيم",
        MEMO_TITLE[memoType],
        COURT_HEADING.labor,
        "أولًا: الوقائع",
        facts,
        "ثانيًا: الأسانيد النظامية",
        `وحيث إن المادة (77) من نظام العمل: «${official}»، وبما أن العلاقة انتهت دون إنذار، فإن الأجر المستحق يدخل في هذا النص.`,
        "رابعًا: الطلبات",
        "إلزام المدّعى عليه بأجر شهر أغسطس.",
        "وبناءً على ما تقدم، نلتمس من فضيلتكم الحكم بالطلبات.",
      ].join("\n");
      const reviewed = reviewModelDraft(mocked, source);
      expect(reviewed.ok).toBe(true);
      if (!reviewed.ok) continue;
      expect(reviewed.draft.body.split("بسم الله الرحمن الرحيم").length - 1).toBe(1);
      expect(reviewed.draft.body).not.toContain("{{cite:");
      expect(reviewed.draft.body).not.toContain("https://");
      expect(reviewed.draft.body).not.toContain("1445");
      expect(reviewed.draft.body).toContain(MEMO_TITLE[memoType]);
      expect(reviewed.draft.citations).toEqual([{ kind: "article", id: "a77", number: "77" }]);
      const fallback = humanMemo(source);
      expect(fallback.body).toContain(facts);
      expect(fallback.body).not.toContain("لم يُسترجع");
      expect(fallback.body).not.toContain("https://");
      expect(findAiTell(fallback.body)).toBeNull();
    }
    const openings = MEMO_TYPES.map((memoType) => humanMemo(packet(memoType)).body.split("\n").find((line) => line.startsWith("تتلخص") || line.startsWith("يدفع") || line.startsWith("جواب") || line.startsWith("أسباب") || line.includes("دفاع") || line.includes("الاعتراض") || line.includes("الدعوى") || line.includes("الجواب")));
    expect(new Set(openings).size).toBe(MEMO_TYPES.length);
  });

  it("rejects a statute name, a loose quote, a missing verse, and an invented name", () => {
    expect(rejectedReason(reviewModelDraft(`بسم الله الرحمن الرحيم\nالمادة (77) من نظام الشركات: «${official}»`, packet("lawsuit")))).toContain("statute:77");
    expect(rejectedReason(reviewModelDraft("بسم الله الرحمن الرحيم\n«نص محرف لا يطابق النص المحفوظ حرفًا.»", packet("defense")))).toBe("quote");
    const withVerse = packet("reply", {
      articles: [],
      sharia: [{ id: "s1", kind: "quran", reference: "2:282", textAr: "يا أيها الذين آمنوا إذا تداينتم بدين", textEn: "", sourceUrl: "https://tanzil.net/download/", isSample: false }],
    });
    expect(rejectedReason(reviewModelDraft("بسم الله الرحمن الرحيم\nيستند إلى 2:282 دون إيراد النص.", withVerse))).toContain("sharia:2:282");
    expect(rejectedReason(reviewModelDraft(`بسم الله الرحمن الرحيم\n${facts}\nشركة زهور لم تذكر.\nالمادة (77) من نظام العمل: «${official}»`, packet("appeal")))).toContain("شركة زهور");
  });

  it("drops source marks and keeps one basmala", () => {
    const reviewed = reviewModelDraft(
      [
        "بسم الله الرحمن الرحيم",
        "بسم الله الرحمن الرحيم",
        `المادة (77) من نظام العمل: «${official}»`,
        "المصدر: https://laws.boe.gov.sa/example",
        "الإصدار 1445",
        "{{cite:article:a77:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}}",
        facts,
      ].join("\n"),
      packet("lawsuit"),
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.draft.body.split("بسم الله الرحمن الرحيم").length - 1).toBe(1);
    expect(reviewed.draft.body).not.toContain("https://");
    expect(reviewed.draft.body).not.toContain("{{cite:");
    expect(reviewed.draft.body).not.toContain("1445");
    expect(reviewed.draft.body).toContain(official);
  });

  it("flags markdown, emoji, and English", () => {
    expect(findAiTell("**عنوان**")).toBe("markdown");
    expect(findAiTell("نص ✅")).toBe("emoji");
    expect(findAiTell("memo text")).toBe("memo");
    expect(rejectedReason(reviewModelDraft("بسم الله الرحمن الرحيم\nكذكاء اصطناعي أكتب.", packet("lawsuit", { articles: [] })))).toContain("كذكاء اصطناعي");
    expect(rejectedReason(reviewModelDraft("بسم الله الرحمن الرحيم\nلا أستطيع صياغة ذلك.", packet("lawsuit", { articles: [] })))).toContain("لا أستطيع");
    expect(rejectedReason(reviewModelDraft("بسم الله الرحمن الرحيم\nإليك المذكرة.", packet("lawsuit", { articles: [] })))).toContain("إليك");
  });

  it("writes a filing when nothing was retrieved and keeps a precedent", () => {
    const empty = humanMemo(packet("defense", { articles: [], sharia: [] }));
    expect(empty.body).not.toMatch(/المادة\s*\(/);
    expect(empty.body).not.toContain("لم يُسترجع");
    expect(empty.citations).toEqual([]);
    const withJudgment = humanMemo(packet("appeal", {
      judgments: [{
        id: "j1",
        judgmentNo: "4530838530",
        court: "المحكمة العمالية",
        city: "الرياض",
        caseNo: "1",
        judgmentDateHijri: "",
        judgmentDateGregorian: "",
        title: "",
        fullText: "حكمت الدائرة بإلزام صاحب العمل بالأجر.",
        sourceUrl: "https://www.moj.gov.sa/example",
        isSample: false,
      }],
    }));
    expect(withJudgment.body).toContain("4530838530");
    expect(withJudgment.body).toContain("حكمت الدائرة بإلزام صاحب العمل بالأجر.");
    expect(withJudgment.body).not.toContain("https://");
    expect(withJudgment.citations.map((item) => item.kind).sort()).toEqual(["article", "judgment"]);
    const headed = reviewModelDraft(`بسم الله الرحمن الرحيم\n${facts}\nالمادة (77) من نظام العمل: «${official}»`, packet("lawsuit", { letterhead: "مكتب خالد" }));
    expect(headed.ok).toBe(true);
    if (!headed.ok) return;
    expect(headed.draft.body).toContain("مكتب خالد");
    expect(headed.draft.body).toContain(COURT_HEADING.labor);
    expect(draftPrompt(packet("reply"))).toContain(facts);
    expect(draftPrompt(packet("reply", { articles: [] }))).toContain("لا نص محفوظ");
  });
});

describe("memo pdf", () => {
  it("prints the filing without a source line", async () => {
    const draft = humanMemo(packet("lawsuit"));
    const bytes = await renderPdf({ title: draft.title, body: draft.body, fontPath: fontFile("") });
    const dir = mkdtempSync(path.join(tmpdir(), "elw-draft-"));
    const file = path.join(dir, "memo.pdf");
    writeFileSync(file, bytes);
    const text = execFileSync("pdftotext", ["-enc", "UTF-8", file, "-"], { encoding: "utf8" });
    expect(text).toContain("صحيفة دعوى");
    expect(text).toContain("خالد");
    expect(text.split("بسم الله الرحمن الرحيم").length - 1).toBe(1);
    expect(text).not.toContain("http");
    expect(text).not.toContain("cite");
  }, 60000);
});
