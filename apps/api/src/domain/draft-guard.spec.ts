import { MEMO_TYPES, type MemoType } from "@elawyer/types";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { citationLabel } from "./article-numbers";
import { textHash } from "./citations";
import { COURT_HEADING, MEMO_TITLE, type RetrievedArticle, type RetrievedJudgment } from "./draft";
import { draftCheckRecord, draftPrompt, findAiTell, humanMemo, renumberSections, reviewModelDraft, textMatchesOfficial, type DraftPacket, type SettledDraft } from "./draft-guard";
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

const facts = "يعمل خالد بن سامي لدى شركة أفق منذ ثلاث سنوات، وانتهت العلاقة في أغسطس 2026 دون إنذار، ولم يُصرف أجر شهر أغسطس.";
const replyFacts = "قالت مذكرة الخصم إن العلاقة انتهت في أغسطس 2026 دون إنذار. وقالت كذلك إن أجر شهر أغسطس لم يُصرف لخالد بن سامي لدى شركة أفق.";
const appealFacts = `${facts} صدر الحكم رقم ${judgmentFile.judgmentNo} بتاريخ ${judgmentFile.judgmentDateGregorian}.`;

function wageArticle(): RetrievedArticle {
  return {
    id: "labor-77",
    number: record!.number,
    textAr: record!.textAr,
    textEn: "",
    lawNameAr: labor.nameAr,
    lawNameEn: "",
    sourceUrl: record!.sourceUrl,
    isSample: false,
    version: labor.version,
    effectiveDate: "2005-09-27",
  };
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
    articles: [wageArticle()],
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

function headings(body: string): string[] {
  return body.match(/^(أولًا|ثانيًا|ثالثًا|رابعًا|خامسًا|سادسًا):/gm) || [];
}

function mocked(memoType: MemoType): string {
  const quote = "[[ref:labor-77]]";
  if (memoType === "defense") {
    return [
      "بسم الله الرحمن الرحيم",
      MEMO_TITLE.defense,
      COURT_HEADING.labor,
      "المدّعى عليه: شركة أفق",
      "أولًا: الدفوع الشكلية",
      "لا يقوم دفع شكلي على نص محفوظ مطابق.",
      "ثانيًا: الدفوع الموضوعية",
      facts,
      `وحيث إن ${quote}، والدفع الموضوعي يدخل في هذا النص.`,
      "ثالثًا: الطلبات",
      "نلتمس من فضيلتكم رد الدعوى.",
    ].join("\n");
  }
  if (memoType === "reply") {
    return [
      "بسم الله الرحمن الرحيم",
      MEMO_TITLE.reply,
      COURT_HEADING.labor,
      "أولًا: الرد على مذكرة الخصم",
      "البند 1: قالت مذكرة الخصم إن العلاقة انتهت في أغسطس 2026 دون إنذار.",
      "وهذا البند لا يسلم.",
      "البند 2: وقالت كذلك إن أجر شهر أغسطس لم يُصرف لخالد بن سامي لدى شركة أفق.",
      "والجواب عن هذا البند فيما سيأتي.",
      "ثانيًا: الأسانيد",
      `وبما أن ${quote}.`,
      "ثالثًا: الطلبات",
      "رد ما جاء في مذكرة الخصم.",
    ].join("\n");
  }
  if (memoType === "appeal") {
    return [
      "بسم الله الرحمن الرحيم",
      MEMO_TITLE.appeal,
      COURT_HEADING.appeal,
      `المعترض: خالد بن سامي`,
      "أولًا: الحكم المعترض عليه",
      `الحكم رقم ${judgmentFile.judgmentNo} الصادر بتاريخ ${judgmentFile.judgmentDateGregorian}.`,
      "ثانيًا: أوجه الاعتراض",
      appealFacts,
      "ثالثًا: الأسانيد",
      `ولما كانت ${quote}.`,
      "رابعًا: الطلبات",
      "نلتمس من فضيلتكم نقض الحكم.",
    ].join("\n");
  }
  return [
    "بسم الله الرحمن الرحيم",
    MEMO_TITLE.lawsuit,
    COURT_HEADING.labor,
    "المدّعي: خالد بن سامي",
    "المدّعى عليه: شركة أفق",
    "أولًا: الوقائع",
    facts,
    "ثانيًا: الأسانيد النظامية",
    `وحيث إن ${quote}، وبما أن الأجر لم يُصرف عند انتهاء العلاقة فإن هذا النص يحكم الواقعة.`,
    "ثالثًا: الطلبات",
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
      expect(reviewed.draft.citations).toEqual([{ kind: "article", id: "labor-77", number: record!.number }]);
      expect(headings(body).join(",")).toBe(headings(body).filter((item, index, all) => all.indexOf(item) === index).join(","));
      const fallback = humanMemo(source);
      expect(fallback.body).toContain(memoType === "reply" ? replyFacts.split(". ")[0] : memoType === "appeal" ? facts : facts);
      expect(fallback.body).not.toContain("لم يُسترجع");
      expect(fallback.body).not.toContain("https://");
      expect(findAiTell(fallback.body)).toBeNull();
      if (memoType === "lawsuit") {
        expect(body).toContain("الوقائع");
        expect(body).toContain("الأسانيد");
        expect(body).toContain("الطلبات");
        expect(body).toContain("المدّعي: خالد بن سامي");
        expect(body).toContain("إلزام المدّعى عليه بأجر شهر أغسطس.");
        expect(headings(fallback.body)).toEqual(["أولًا:", "ثانيًا:", "ثالثًا:"]);
      }
      if (memoType === "defense") {
        expect(body).toContain("الدفوع الشكلية");
        expect(body).toContain("الدفوع الموضوعية");
        expect(body).toContain("رد الدعوى");
        expect(body).not.toContain("إلزام المدّعى عليه");
        expect(fallback.body).toContain("الدفوع الشكلية");
        expect(fallback.body).toContain("الدفوع الموضوعية");
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
        expect(fallback.body).toContain("الرد على مذكرة الخصم");
        expect(fallback.body).toContain("البند 1");
        expect(fallback.body).toContain("البند 2");
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
    expect(empty.body).toContain("الدفوع الشكلية");
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
    expect(draftPrompt(packet("lawsuit"))).not.toContain(record!.textAr);
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
    expect(reviewed.failures.some((item) => item.failureType === "paraphrase")).toBe(true);
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
