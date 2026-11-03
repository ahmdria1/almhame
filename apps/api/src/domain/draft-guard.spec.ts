import { MEMO_TYPES, type MemoType } from "@elawyer/types";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { citationLabel } from "./article-numbers";
import { textHash } from "./citations";
import { COURT_HEADING, MEMO_TITLE, type RetrievedArticle, type RetrievedJudgment } from "./draft";
import { closingBlock, draftCheckRecord, draftPrompt, findAiTell, humanMemo, judgmentPrecedesFacts, matchArticles, renumberSections, reviewModelDraft, textMatchesOfficial, type DraftPacket, type SettledDraft } from "./draft-guard";
import { fontFile, renderPdf } from "../render";
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import path from "path";

const labor = JSON.parse(readFileSync(join(__dirname, "../../../../corpus/official/boe/labor.json"), "utf8")) as {
  nameAr: string;
  version: string;
  articles: { number: string; textAr: string; sourceUrl: string }[];
};
const record = labor.articles.find((item) => citationLabel(item.number) === "77");
if (!record) throw new Error("stored labor article 77 is missing");
const FAKE_ARTICLE = "وحيث إن المادة (77) من نظام العمل: «إذا انتهت علاقة العمل وجب دفع الأجر ومكافأة نهاية الخدمة خلال أسبوع.»";
const debtVerse = readFileSync(join(__dirname, "../../../../corpus/official/tanzil/quran-uthmani.txt"), "utf8")
  .split("\n")
  .find((line) => line.startsWith("2|282|"))
  ?.slice("2|282|".length)
  .trim() || "";
const judgmentFile = JSON.parse(readFileSync(join(__dirname, "../../../../corpus/official/judgements/4530838530.json"), "utf8")) as {
  judgmentNo: string;
  court: string;
  city: string;
  caseNo: string;
  judgmentDateHijri: string;
  judgmentDateGregorian: string;
  title: string;
  fullText: string;
  sourceUrl: string;
};

const facts = "يعمل خالد بن سامي لدى شركة أفق منذ ثلاث سنوات، وأنهى صاحب العمل العقد في أغسطس 2023 لسبب غير مشروع ودون إنذار، ولم يُصرف أجر شهر أغسطس.";
const replyFacts = "قالت مذكرة الخصم إن صاحب العمل أنهى العقد في أغسطس 2023 لسبب غير مشروع ودون إنذار. وقالت كذلك إن أجر شهر أغسطس لم يُصرف لخالد بن سامي لدى شركة أفق.";
const appealFacts = `${facts} صدر الحكم رقم ${judgmentFile.judgmentNo} بتاريخ ${judgmentFile.judgmentDateGregorian}.`;

const wageRecord = labor.articles.find((item) => citationLabel(item.number) === "88");
if (!wageRecord) throw new Error("stored labor article 88 is missing");

function storedArticle(id: string, article: { number: string; textAr: string; sourceUrl: string }): RetrievedArticle {
  return {
    id,
    number: article.number,
    textAr: article.textAr,
    textEn: "",
    lawNameAr: labor.nameAr,
    lawNameEn: "",
    sourceUrl: article.sourceUrl,
    isSample: false,
    version: labor.version,
    effectiveDate: "2005-09-27",
  };
}

function wageArticle(): RetrievedArticle {
  return storedArticle("labor-77", record!);
}

function settlementArticle(): RetrievedArticle {
  return storedArticle("labor-88", wageRecord!);
}

function packet(memoType: MemoType, extra?: Partial<DraftPacket>): DraftPacket {
  const slots = {
    plaintiff: "خالد بن سامي",
    defendant: "شركة أفق",
    facts: memoType === "reply" ? replyFacts : memoType === "appeal" ? appealFacts : facts,
    requests: memoType === "defense" ? "رد الدعوى." : memoType === "appeal" ? "نقض الحكم." : memoType === "reply" ? "رد ما جاء في مذكرة الخصم." : "إلزام المدّعى عليه بأجر شهر أغسطس.",
  };
  return {
    court: "labor",
    memoType,
    slots,
    articles: [wageArticle(), settlementArticle()],
    sharia: [],
    title: MEMO_TITLE[memoType],
    courtHeading: memoType === "appeal" ? COURT_HEADING.appeal : COURT_HEADING.labor,
    ...extra,
    ...(extra?.slots ? { slots: { ...slots, ...extra.slots } } : {}),
  };
}

function rejectedReason(result: { ok: true; draft: SettledDraft } | { ok: false; reason: string }): string {
  if (result.ok === false) return result.reason;
  throw new Error("expected rejection");
}

function closingFromReview(memoType: MemoType): string {
  const reviewed = reviewModelDraft(mocked(memoType), packet(memoType));
  if (reviewed.ok === false) throw new Error(reviewed.reason);
  return reviewed.draft.body;
}

function headings(body: string): string[] {
  return body.match(/^(أولًا|ثانيًا|ثالثًا|رابعًا|خامسًا|سادسًا):/gm) || [];
}

function mocked(memoType: MemoType): string {
  const compensation = "[[ref:labor-77]]";
  const settlement = "[[ref:labor-88]]";
  if (memoType === "defense") {
    return [
      "بسم الله الرحمن الرحيم",
      MEMO_TITLE.defense,
      COURT_HEADING.labor,
      "المدّعى عليه: شركة أفق",
      "الدفوع الموضوعية",
      "يدفع المدّعى عليه بأن التعويض عن الإنهاء لا يستحق إلا إذا أثبت المدّعي أن الإنهاء كان لسبب غير مشروع.",
      `وحيث إن ${compensation}، لأن إنهاء العقد لسبب غير مشروع يرتب التعويض للطرف المتضرر.`,
      "وبشأن الأجر، يدفع المدّعى عليه بأن وجوب الدفع معلق على انتهاء الخدمة وثبوت بقاء الأجر دون صرف.",
      `وبما أن ${settlement}، لأن انتهاء الخدمة يوجب دفع الأجر الذي لم يُصرف خلال أسبوع.`,
      "الطلبات",
      "نلتمس من فضيلتكم رد الدعوى.",
    ].join("\n");
  }
  if (memoType === "reply") {
    return [
      "بسم الله الرحمن الرحيم",
      MEMO_TITLE.reply,
      COURT_HEADING.labor,
      "الرد على مذكرة الخصم",
      "البند 1: قالت مذكرة الخصم إن صاحب العمل أنهى العقد في أغسطس 2023 لسبب غير مشروع ودون إنذار.",
      "الجواب: إنهاء العقد لسبب غير مشروع يرتب التعويض للطرف المتضرر، وفق المادة الحاكمة لهذا الإنهاء.",
      "البند 2: وقالت كذلك إن أجر شهر أغسطس لم يُصرف لخالد بن سامي لدى شركة أفق.",
      "الجواب: بقاء الأجر دون صرف بعد انتهاء الخدمة يوجب أداءه خلال أسبوع من انتهاء العلاقة.",
      "الأسانيد",
      `وبما أن ${compensation}، لأن الإنهاء لسبب غير مشروع يرتب التعويض.`,
      `ولما كانت ${settlement}، لأن انتهاء الخدمة يوجب دفع الأجر غير المصروف.`,
      "الطلبات",
      "رد ما جاء في مذكرة الخصم.",
    ].join("\n");
  }
  if (memoType === "appeal") {
    return [
      "بسم الله الرحمن الرحيم",
      MEMO_TITLE.appeal,
      COURT_HEADING.appeal,
      "المعترض: خالد بن سامي",
      "الحكم المعترض عليه",
      `الحكم رقم ${judgmentFile.judgmentNo} الصادر بتاريخ ${judgmentFile.judgmentDateGregorian}.`,
      "أوجه الاعتراض",
      appealFacts,
      "الأسانيد",
      `ولما كانت ${compensation}، لأن الإنهاء لسبب غير مشروع يرتب التعويض.`,
      `وحيث إن ${settlement}، لأن انتهاء الخدمة يوجب دفع الأجر غير المصروف.`,
      "الطلبات",
      "نلتمس من فضيلتكم نقض الحكم.",
    ].join("\n");
  }
  return [
    "بسم الله الرحمن الرحيم",
    MEMO_TITLE.lawsuit,
    COURT_HEADING.labor,
    "المدّعي: خالد بن سامي",
    "المدّعى عليه: شركة أفق",
    "الوقائع",
    facts,
    "الأسانيد النظامية",
    `وحيث إن ${compensation}، لأن إنهاء العقد لسبب غير مشروع يرتب التعويض للطرف المتضرر.`,
    `وبما أن ${settlement}، لأن انتهاء الخدمة يوجب دفع الأجر الذي لم يُصرف.`,
    "الطلبات",
    "إلزام المدّعى عليه بالتعويض المقرر عن إنهاء العقد لسبب غير مشروع.",
    "إلزام المدّعى عليه بأجر شهر أغسطس.",
    "وبناءً على ما تقدم، نلتمس من فضيلتكم الحكم بالطلبات.",
  ].join("\n");
}

describe("draft guard", () => {
  it("uses the stored labor article and no other wording", () => {
    const article = wageArticle();
    expect(article.textAr).toBe(record!.textAr);
    expect(textHash(article.textAr)).toBe(textHash(record!.textAr));
    expect(article.textAr).toContain("سبب غير مشروع");
    expect(article.textAr).not.toContain("وجب دفع الأجر ومكافأة نهاية الخدمة خلال أسبوع");
    expect(textMatchesOfficial(article.textAr, record!.textAr)).toBe(true);
  });

  it("replaces an altered quote with the stored text", () => {
    const source = packet("lawsuit");
    const altered = record!.textAr.replace("سبب غير مشروع", "سبب غير مشروع مع زيادة لم تذكر");
    const reviewed = reviewModelDraft(
      `بسم الله الرحمن الرحيم\nصحيفة دعوى\n${COURT_HEADING.labor}\nوحيث إن المادة (${citationLabel(record!.number)}) من ${labor.nameAr}: «${altered}»\n${facts}`,
      source,
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.draft.body).toContain(record!.textAr);
    expect(reviewed.draft.body).not.toContain("زيادة لم تذكر");
  });

  it("rejects an article that was not retrieved", () => {
    const reviewed = reviewModelDraft(
      `بسم الله الرحمن الرحيم\nوحيث إن المادة (84) من ${labor.nameAr}.`,
      packet("defense"),
    );
    expect(rejectedReason(reviewed)).toContain("article:84");
  });

  it("rejects an amount that the user did not state", () => {
    const reviewed = reviewModelDraft(
      `بسم الله الرحمن الرحيم\n${facts}\nويطالب بمبلغ 50000 ريال.\nالمادة (${citationLabel(record!.number)}) من ${labor.nameAr}: «${record!.textAr}»`,
      packet("reply"),
    );
    expect(rejectedReason(reviewed)).toContain("50000");
  });

  it("rejects an assistant phrase", () => {
    expect(findAiTell("بالتأكيد هذه المذكرة")).toBe("بالتأكيد");
    const reviewed = reviewModelDraft("بسم الله الرحمن الرحيم\nبصفتي نموذج أكتب لكم المذكرة.", packet("appeal", { articles: [] }));
    expect(reviewed.ok).toBe(false);
  });

  it("keeps a distinct golden memo for each filing type", () => {
    const bodies: string[] = [];
    for (const memoType of MEMO_TYPES) {
      const source = packet(memoType);
      const reviewed = reviewModelDraft(mocked(memoType), source);
      expect(reviewed.ok).toBe(true);
      if (!reviewed.ok) continue;
      const body = reviewed.draft.body;
      bodies.push(body);
      expect(body.split("بسم الله الرحمن الرحيم").length - 1).toBe(1);
      expect(body).not.toContain("{{cite:");
      expect(body).not.toContain("https://");
      expect(body).toContain(`«${record!.textAr}»`);
      expect(body.split(record!.textAr).length - 1).toBe(1);
      expect(body).toContain(`«${wageRecord!.textAr}»`);
      expect(body.split(wageRecord!.textAr).length - 1).toBe(1);
      expect(reviewed.draft.citations).toEqual([
        { kind: "article", id: "labor-77", number: record!.number },
        { kind: "article", id: "labor-88", number: wageRecord!.number },
      ]);
      expect(headings(body).join(",")).toBe(headings(body).filter((item, index, all) => all.indexOf(item) === index).join(","));
      const fallback = humanMemo(source);
      if (memoType === "reply") expect(fallback.body).toContain(replyFacts.split(". ")[0]);
      if (memoType === "lawsuit" || memoType === "appeal") expect(fallback.body).toContain(facts);
      expect(fallback.body).not.toContain("لم يُسترجع");
      expect(fallback.body).not.toContain("https://");
      expect(findAiTell(fallback.body)).toBeNull();
      if (memoType === "lawsuit") {
        expect(body).toContain("الوقائع");
        expect(body).toContain("الأسانيد");
        expect(body).toContain("الطلبات");
        expect(body).toContain("المدّعي: خالد بن سامي");
        expect(body).toContain("إلزام المدّعى عليه بالتعويض المقرر عن إنهاء العقد لسبب غير مشروع.");
        expect(body).toContain("إلزام المدّعى عليه بأجر شهر أغسطس.");
        expect(headings(fallback.body)).toEqual(["أولًا:", "ثانيًا:", "ثالثًا:"]);
      }
      if (memoType === "defense") {
        expect(body).not.toContain("الدفوع الشكلية");
        expect(body).toContain("الدفوع الموضوعية");
        expect(body).toContain("رد الدعوى");
        expect(body).not.toContain("إلزام المدّعى عليه");
        expect(body).not.toContain(facts);
        expect(fallback.body).not.toContain("الدفوع الشكلية");
        expect(fallback.body).toContain("الدفوع الموضوعية");
        expect(fallback.body).not.toContain(facts);
        expect(fallback.body).not.toContain("إلزام المدّعى عليه");
        const charged = humanMemo(packet("defense", { slots: { plaintiff: "خالد بن سامي", defendant: "شركة أفق", facts, requests: "إلزام المدّعى عليه بأجر شهر أغسطس." } }));
        expect(charged.body).not.toContain("إلزام المدّعى عليه");
        expect(charged.body).toMatch(/رد الدعوى|رفض الدعوى|عدم قبول الدعوى/);
        expect(fallback.body).toMatch(/رد الدعوى|رفض الدعوى|عدم قبول الدعوى/);
      }
      if (memoType === "reply") {
        expect(body).toContain("الرد على مذكرة الخصم");
        expect(body).toContain("البند 1");
        expect(body).toContain("البند 2");
        expect(body).toContain("الجواب:");
        expect(fallback.body).toContain("الرد على مذكرة الخصم");
        expect(fallback.body).toContain("البند 1");
        expect(fallback.body).toContain("البند 2");
        expect(fallback.body).toContain("المادة (77)");
        expect(fallback.body).toContain("المادة (88)");
      }
      if (memoType === "appeal") {
        expect(body).toContain("محكمة الاستئناف");
        expect(body).toContain("أوجه الاعتراض");
        expect(body).toContain("نقض الحكم");
        expect(body).toContain(judgmentFile.judgmentNo);
        expect(body).toContain(judgmentFile.judgmentDateGregorian);
        expect(fallback.body).toContain(COURT_HEADING.appeal);
        expect(fallback.body).toContain("أوجه الاعتراض");
        expect(fallback.body).toContain("نقض الحكم");
        expect(fallback.body).toContain(judgmentFile.judgmentNo);
      }
    }
    expect(new Set(bodies).size).toBe(MEMO_TYPES.length);
  });

  it("renumbers a gap and does not skip an empty section", () => {
    expect(renumberSections("أولًا: الوقائع\nثانيًا: الأسانيد\nرابعًا: الطلبات")).toBe("أولًا: الوقائع\nثانيًا: الأسانيد\nثالثًا: الطلبات");
    expect(renumberSections("ثانيًا: الوقائع\nخامسًا: الطلبات")).toBe("أولًا: الوقائع\nثانيًا: الطلبات");
    expect(headings(humanMemo(packet("lawsuit")).body)).toEqual(["أولًا:", "ثانيًا:", "ثالثًا:"]);
    expect(humanMemo(packet("lawsuit")).body).not.toContain("خامسًا");
    const reviewed = reviewModelDraft(mocked("lawsuit").replace("ثالثًا: الطلبات", "رابعًا: الطلبات"), packet("lawsuit"));
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(headings(reviewed.draft.body)).toEqual(["أولًا:", "ثانيًا:", "ثالثًا:"]);
    expect(reviewed.draft.body).not.toContain("رابعًا:");
  });

  it("changes the connective when the facts change", () => {
    const seen = new Set<string>();
    for (const mark of ["منذ سنة واحدة.", "منذ سنتين.", "منذ أربع سنوات.", "منذ ست سنوات.", "منذ سبع سنوات.", "منذ ثماني سنوات."]) {
      const draft = humanMemo(packet("lawsuit", {
        slots: { plaintiff: "خالد بن سامي", defendant: "شركة أفق", facts: `${facts} ${mark}`, requests: "إلزام المدّعى عليه بأجر شهر أغسطس." },
      }));
      const line = draft.body.split("\n").find((item) => item.includes("«"));
      seen.add(line || "");
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("rejects a statute name, a loose quote, a missing verse, and an invented name", () => {
    expect(rejectedReason(reviewModelDraft(`بسم الله الرحمن الرحيم\nالمادة (${citationLabel(record!.number)}) من نظام الشركات: «${record!.textAr}»`, packet("lawsuit")))).toContain("statute:");
    const altered = record!.textAr.replace("سبب غير مشروع", "سبب غير مشروع مع زيادة لم تذكر");
    expect(rejectedReason(reviewModelDraft(`بسم الله الرحمن الرحيم\n«${altered}»`, packet("defense")))).toBe("quote");
    const withVerse = packet("reply", {
      articles: [],
      sharia: [{ id: "s1", kind: "quran", reference: "2:282", textAr: debtVerse, textEn: "", sourceUrl: "https://tanzil.net/download/", isSample: false }],
    });
    expect(rejectedReason(reviewModelDraft("بسم الله الرحمن الرحيم\nيستند إلى 2:282 دون إيراد النص.", withVerse))).toContain("sharia:2:282");
    expect(rejectedReason(reviewModelDraft(`بسم الله الرحمن الرحيم\n${facts}\nشركة زهور لم تذكر.\nالمادة (${citationLabel(record!.number)}) من ${labor.nameAr}: «${record!.textAr}»`, packet("appeal")))).toContain("شركة زهور");
  });

  it("rejects a defense that asks to charge the defendant", () => {
    const reviewed = reviewModelDraft(
      `بسم الله الرحمن الرحيم\nأولًا: الدفوع الموضوعية\n${facts}\nالمادة (${citationLabel(record!.number)}) من ${labor.nameAr}: «${record!.textAr}»\nثانيًا: الطلبات\nإلزام المدّعى عليه بأجر شهر أغسطس.`,
      packet("defense"),
    );
    expect(rejectedReason(reviewed)).toBe("request");
  });

  it("drops source marks and keeps one basmala", () => {
    const reviewed = reviewModelDraft(
      [
        "بسم الله الرحمن الرحيم",
        "بسم الله الرحمن الرحيم",
        `المادة (${citationLabel(record!.number)}) من ${labor.nameAr}: «${record!.textAr}»`,
        "المصدر: https://laws.boe.gov.sa/example",
        "{{cite:article:labor-77:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}}",
        facts,
      ].join("\n"),
      packet("lawsuit"),
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.draft.body.split("بسم الله الرحمن الرحيم").length - 1).toBe(1);
    expect(reviewed.draft.body).not.toContain("https://");
    expect(reviewed.draft.body).not.toContain("{{cite:");
    expect(reviewed.draft.body).toContain(record!.textAr);
  });

  it("flags markdown, emoji, and English", () => {
    expect(findAiTell("**عنوان**")).toBe("markdown");
    expect(findAiTell("نص ✅")).toBe("emoji");
    expect(findAiTell("memo text")).toBe("memo");
    expect(rejectedReason(reviewModelDraft("بسم الله الرحمن الرحيم\nكذكاء اصطناعي أكتب.", packet("lawsuit", { articles: [] })))).toContain("كذكاء اصطناعي");
    expect(rejectedReason(reviewModelDraft("بسم الله الرحمن الرحيم\nلا أستطيع صياغة ذلك.", packet("lawsuit", { articles: [] })))).toContain("لا أستطيع");
    expect(rejectedReason(reviewModelDraft("بسم الله الرحمن الرحيم\nإليك المذكرة.", packet("lawsuit", { articles: [] })))).toContain("إليك");
  });

  it("writes a filing when nothing was retrieved and keeps a stored precedent", () => {
    const empty = humanMemo(packet("defense", { articles: [], sharia: [] }));
    expect(empty.body).not.toMatch(/المادة\s*\(/);
    expect(empty.body).not.toContain("لم يُسترجع");
    expect(empty.body).not.toContain("الدفوع الشكلية");
    expect(empty.body).toContain("الدفوع الموضوعية");
    expect(empty.citations).toEqual([]);
    const stored: RetrievedJudgment = {
      id: "j1",
      judgmentNo: judgmentFile.judgmentNo,
      court: judgmentFile.court,
      city: judgmentFile.city,
      caseNo: judgmentFile.caseNo,
      judgmentDateHijri: judgmentFile.judgmentDateHijri,
      judgmentDateGregorian: judgmentFile.judgmentDateGregorian,
      title: judgmentFile.title,
      fullText: judgmentFile.fullText,
      sourceUrl: judgmentFile.sourceUrl,
      isSample: false,
    };
    const withJudgment = humanMemo(packet("appeal", { judgments: [stored] }));
    expect(withJudgment.body).toContain(judgmentFile.judgmentNo);
    expect(withJudgment.body).toContain(judgmentFile.fullText.slice(0, 24));
    expect(withJudgment.body).not.toContain("https://");
    expect(withJudgment.citations.some((item) => item.kind === "judgment" && item.number === judgmentFile.judgmentNo)).toBe(true);
    const headed = reviewModelDraft(`بسم الله الرحمن الرحيم\n${facts}\nالمادة (${citationLabel(record!.number)}) من ${labor.nameAr}: «${record!.textAr}»`, packet("lawsuit", { letterhead: "مكتب خالد" }));
    expect(headed.ok).toBe(true);
    if (!headed.ok) return;
    expect(headed.draft.body).toContain("مكتب خالد");
    expect(headed.draft.body).toContain(COURT_HEADING.labor);
    expect(draftPrompt(packet("reply"))).toContain("بندًا بندًا");
    expect(draftPrompt(packet("defense"))).toContain("رد الدعوى");
    expect(draftPrompt(packet("appeal"))).toContain("نقض الحكم");
    expect(draftPrompt(packet("reply", { articles: [] }))).toContain("لا مرجع محفوظ");
    expect(draftPrompt(packet("lawsuit"))).toContain("[[ref:labor-77]]");
    expect(draftPrompt(packet("lawsuit"))).toContain("[[ref:labor-88]]");
    expect(draftPrompt(packet("lawsuit"))).not.toContain(record!.textAr);
    expect(draftPrompt(packet("lawsuit"))).not.toContain(wageRecord!.textAr);
  });

  it("grounds each request in the article that governs it", () => {
    const matches = matchArticles([wageArticle(), settlementArticle()], facts, "إلزام المدّعى عليه بأجر شهر أغسطس.");
    expect(matches.map((item) => item.issue)).toEqual(["termination-compensation", "end-of-service-wage"]);
    expect(matches[0]?.article.id).toBe("labor-77");
    expect(matches[1]?.article.id).toBe("labor-88");
    expect(matchArticles([wageArticle()], "لم يُصرف أجر شهر أغسطس بعد انتهاء الخدمة.", "إلزامه بالأجر")).toEqual([]);
    const draft = humanMemo(packet("lawsuit"));
    const outside = draft.body.split(record!.textAr).join(" ").split(wageRecord!.textAr).join(" ");
    expect(outside).toContain("يرتب للطرف المتضرر التعويض");
    expect(outside).toContain("خلال أسبوع");
    expect(draft.body).not.toContain("هذا النص يحكم الواقعة");
    const formal = humanMemo(packet("defense", { procedural: [settlementArticle()] }));
    expect(formal.body).toContain("الدفوع الشكلية");
    expect(headings(formal.body)[0]).toBe("أولًا:");
  });

  it("rejects a judgment dated before the facts it decides", () => {
    expect(judgmentPrecedesFacts(appealFacts, judgmentFile.judgmentDateGregorian)).toBe(false);
    const early = appealFacts.replaceAll("2023", "2026");
    expect(judgmentPrecedesFacts(early, "2024-03-14")).toBe(true);
    const reviewed = reviewModelDraft(mocked("appeal").replaceAll("2023", "2026"), packet("appeal", {
      slots: { plaintiff: "خالد بن سامي", defendant: "شركة أفق", facts: early, requests: "نقض الحكم." },
    }));
    expect(rejectedReason(reviewed)).toBe("judgment-date");
    expect(humanMemo(packet("appeal", {
      slots: { plaintiff: "خالد بن سامي", defendant: "شركة أفق", facts: early, requests: "نقض الحكم." },
    })).body).toContain("تاريخ الحكم سابق");
  });

  it.each(MEMO_TYPES)("ends the %s memo with the court closing block", (memoType) => {
    const heading = memoType === "appeal" ? "مقدم اللائحة" : memoType === "lawsuit" ? "مقدم الصحيفة" : "مقدم المذكرة";
    const role = memoType === "defense" ? "المدّعى عليه" : memoType === "appeal" ? "المعترض" : "المدّعي";
    const name = memoType === "defense" ? "شركة أفق" : "خالد بن سامي";
    for (const body of [humanMemo(packet(memoType)).body, closingFromReview(memoType)]) {
      const trimmed = body.trimEnd();
      const block = trimmed.slice(trimmed.lastIndexOf("والله يحفظكم ويرعاكم"));
      expect(trimmed.endsWith(closingBlock(packet(memoType)))).toBe(true);
      expect(trimmed.endsWith("التوقيع:")).toBe(true);
      expect(block.startsWith("والله يحفظكم ويرعاكم،،")).toBe(true);
      expect(block).toContain(`${heading}: ${name}`);
      expect(block).toContain(`${role}: ${name}`);
      expect(block).toContain("التاريخ:");
      expect(block.indexOf("التاريخ:")).toBeLessThan(block.indexOf("التوقيع:"));
      expect(trimmed.indexOf("الطلبات")).toBeLessThan(trimmed.lastIndexOf("والله يحفظكم ويرعاكم"));
      expect(trimmed.split("والله يحفظكم ويرعاكم").length - 1).toBe(1);
    }
  });

  it("leaves the filer line blank when the filing has no name", () => {
    const draft = humanMemo(packet("lawsuit", {
      slots: { plaintiff: " ", defendant: "شركة أفق", facts, requests: "إلزام المدّعى عليه بأجر شهر أغسطس." },
    }));
    const block = draft.body.slice(draft.body.lastIndexOf("والله يحفظكم ويرعاكم"));
    expect(block).toContain("مقدم الصحيفة:\nالمدّعي:\nالتاريخ:\nالتوقيع:");
    expect(block).not.toContain("المذكور");
    expect(block).not.toContain("شركة أفق");
    const byDefendant = humanMemo(packet("reply", {
      slots: { plaintiff: "", defendant: "شركة أفق", facts: replyFacts, requests: "رد ما جاء في مذكرة الخصم." },
    }));
    expect(byDefendant.body).toContain("مقدم المذكرة: شركة أفق");
    expect(byDefendant.body).toContain("المدّعى عليه: شركة أفق");
  });

  it("rejects the stock phrases that do not answer the case", () => {
    const phrases = [
      "لا يقوم دفع شكلي على نص محفوظ مطابق",
      "والدفع الموضوعي يدخل في هذا النص",
      "وهذا البند لا يسلم",
      "والجواب عن هذا البند فيما سيأتي",
      "هذا النص يحكم الواقعة",
    ];
    for (const phrase of phrases) {
      expect(findAiTell(phrase)).toBe(phrase);
      for (const memoType of MEMO_TYPES) expect(humanMemo(packet(memoType)).body).not.toContain(phrase);
    }
  });
});

describe("official injection", () => {
  it("never keeps the invented labor sentence", async () => {
    const reviewed = reviewModelDraft(`${FAKE_ARTICLE}\n${facts}`, packet("lawsuit"));
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.draft.body).not.toContain("وجب دفع الأجر ومكافأة نهاية الخدمة خلال أسبوع");
    expect(reviewed.draft.body).toContain(record!.textAr);
    expect(reviewed.failures[0]?.quoteSpan).toContain("وجب دفع الأجر");
    expect(JSON.stringify(reviewed.failures)).not.toContain(facts);
    const bytes = await renderPdf({ title: reviewed.draft.title, body: reviewed.draft.body, fontPath: fontFile("") });
    const dir = mkdtempSync(path.join(tmpdir(), "elw-fake-"));
    const file = path.join(dir, "memo.pdf");
    writeFileSync(file, bytes);
    const text = execFileSync("pdftotext", ["-enc", "UTF-8", file, "-"], { encoding: "utf8" });
    expect(text).not.toContain("وجب دفع الأجر ومكافأة نهاية الخدمة خلال أسبوع");
    expect(text).toContain("سبب غير مشروع");
  }, 60000);

  it("replaces a paraphrase that has no quotation marks", () => {
    const reviewed = reviewModelDraft(
      `بسم الله الرحمن الرحيم\nنصت المادة (77) من نظام العمل على أن إذا انتهت علاقة العمل وجب دفع الأجر خلال أسبوع.\n${facts}`,
      packet("lawsuit"),
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.draft.body).not.toContain("وجب دفع الأجر خلال أسبوع");
    expect(reviewed.draft.body).toContain(record!.textAr);
    expect(reviewed.draft.body.split(record!.textAr).length - 1).toBe(1);
    expect(reviewed.failures.some((item) => item.failureType === "paraphrase")).toBe(true);
    const afterColon = reviewModelDraft(
      `بسم الله الرحمن الرحيم\nالمادة (77) من نظام العمل: إذا انتهت علاقة العمل وجب دفع الأجر خلال أسبوع.\n${facts}`,
      packet("lawsuit"),
    );
    expect(afterColon.ok).toBe(true);
    if (!afterColon.ok) return;
    expect(afterColon.draft.body).not.toContain("وجب دفع الأجر خلال أسبوع");
    expect(afterColon.draft.body.split(record!.textAr).length - 1).toBe(1);
  });

  it("keeps a failure log to the quoted span", () => {
    const secret = "واقعة سرية لا تُسجل: خالد طلب مبلغًا لم يذكره";
    const row = draftCheckRecord({
      recordId: "labor-77",
      articleNumber: record!.number,
      statute: labor.nameAr,
      failureType: "quote",
      quoteSpan: "«إذا انتهت علاقة العمل وجب دفع الأجر ومكافأة نهاية الخدمة خلال أسبوع.»",
      facts: secret,
      memo: `${secret}\n${FAKE_ARTICLE}`,
    });
    const encoded = JSON.stringify(row);
    expect(encoded).not.toContain("واقعة سرية");
    expect(encoded).not.toContain("خالد طلب");
    expect(Object.keys(row).sort()).toEqual(["articleNumber", "failureType", "quoteSpan", "recordId", "statute"]);
    expect(row.quoteSpan).toContain("وجب دفع الأجر");
    expect(row.recordId).toBe("labor-77");
    expect(row.statute).toBe(labor.nameAr);
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
