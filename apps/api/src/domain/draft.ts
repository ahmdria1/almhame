import type { CourtType, MemoType } from "@elawyer/types";
import { citationLabel } from "./article-numbers";
import { textHash, type CitationRef } from "./citations";

export interface RetrievedArticle {
  id: string;
  number: string;
  textAr: string;
  textEn: string;
  lawNameAr: string;
  lawNameEn: string;
  lawKey?: string;
  sourceUrl: string;
  isSample: boolean;
  version: string;
  effectiveDate: string;
}

export interface RetrievedSharia {
  id: string;
  kind: string;
  reference: string;
  textAr: string;
  textEn: string;
  sourceUrl: string;
  isSample: boolean;
}

export interface DraftSlots {
  plaintiff: string;
  defendant: string;
  facts: string;
  requests: string;
}

export const COURT_HEADING: Record<CourtType, string> = {
  general: "فضيلة رئيس المحكمة العامة",
  criminal: "فضيلة رئيس المحكمة الجزائية",
  personal_status: "فضيلة رئيس محكمة الأحوال الشخصية",
  labor: "فضيلة رئيس الدائرة العمالية بالمحكمة العمالية",
  commercial: "فضيلة رئيس المحكمة التجارية",
  enforcement: "فضيلة قاضي التنفيذ",
  administrative: "فضيلة رئيس الدائرة بديوان المظالم",
  appeal: "فضيلة رئيس محكمة الاستئناف",
  supreme: "فضيلة رئيس المحكمة العليا",
};

export const MEMO_TITLE: Record<MemoType, string> = {
  lawsuit: "صحيفة دعوى",
  defense: "مذكرة دفاع",
  reply: "مذكرة جوابية",
  appeal: "لائحة اعتراضية",
};

function slotKey(label: string): "plaintiff" | "defendant" | "requests" | "factsLabel" {
  if (label.includes("طلبات")) return "requests";
  if (label.includes("وقائع")) return "factsLabel";
  if (label.includes("عليه")) return "defendant";
  return "plaintiff";
}

export function readSlots(userTexts: string[]): DraftSlots & { ready: boolean; question: string } {
  const joined = userTexts.map((line) => line.trim()).filter(Boolean).join("\n");
  const hits: { key: "plaintiff" | "defendant" | "requests" | "factsLabel"; from: number; to: number }[] = [];
  const labels = /(?:المدّ?عى عليه|المدّ?عي|الطلبات|الوقائع)\s*[:：]/g;
  let match: RegExpExecArray | null;
  while ((match = labels.exec(joined))) {
    hits.push({ key: slotKey(match[0]), from: match.index, to: match.index + match[0].length });
  }
  const values: Partial<Record<(typeof hits)[number]["key"], string>> = {};
  let narrative = "";
  let cursor = 0;
  for (let index = 0; index < hits.length; index += 1) {
    const hit = hits[index];
    const nextLabel = hits[index + 1]?.from ?? joined.length;
    const lineBreak = joined.indexOf("\n", hit.to);
    const next = lineBreak >= 0 && lineBreak < nextLabel ? lineBreak : nextLabel;
    values[hit.key] = joined.slice(hit.to, next).trim();
    narrative += joined.slice(cursor, hit.from);
    cursor = next;
  }
  narrative += joined.slice(cursor);
  const plaintiff = values.plaintiff?.trim();
  const defendant = values.defendant?.trim();
  const requests = values.requests?.trim();
  const facts = [narrative, values.factsLabel || ""].map((part) => part.trim()).filter(Boolean).join("\n");
  if (facts.length < 30) {
    return {
      plaintiff: plaintiff || "",
      defendant: defendant || "",
      facts,
      requests: requests || "",
      ready: false,
      question: "صف الوقائع بجملة واضحة: ماذا حدث، ومتى، وما الذي تطلبه؟",
    };
  }
  if (!plaintiff) {
    return {
      plaintiff: "",
      defendant: defendant || "",
      facts,
      requests: requests || "",
      ready: false,
      question: "من المدّعي؟ أجب بالصيغة: المدّعي: الاسم.",
    };
  }
  if (!defendant) {
    return {
      plaintiff,
      defendant: "",
      facts,
      requests: requests || "",
      ready: false,
      question: "من المدّعى عليه؟ أجب بالصيغة: المدّعى عليه: الاسم.",
    };
  }
  return {
    plaintiff,
    defendant,
    facts,
    requests: requests || "الحكم وفق الوقائع، مع تحميل المدّعى عليه الرسوم.",
    ready: true,
    question: "الوقائع كافية للصياغة. راجع المذكرة بعد إنشائها، ولا تودعها قبل مطابقة المصادر.",
  };
}

function quoteArticle(article: RetrievedArticle): string[] {
  const mark = article.isSample ? " [عيّنة غير رسمية]" : "";
  const label = citationLabel(article.number);
  const lawName = article.lawNameAr.trim();
  return [
    `المادة (${label}) من ${lawName}${mark}: ${article.textAr}`,
    `{{cite:article:${article.id}:${textHash(article.textAr)}}}`,
    `المصدر: ${article.sourceUrl} — ${article.version} — ${article.effectiveDate}`,
  ];
}

export function composeDraft(input: {
  court: string;
  memoType: MemoType;
  slots: DraftSlots;
  articles: RetrievedArticle[];
  procedural?: RetrievedArticle[];
  sharia: RetrievedSharia[];
  notice?: string | null;
  letterhead?: string | null;
  title?: string;
  courtHeading?: string;
}): { title: string; body: string; citations: CitationRef[] } {
  const title = input.title || MEMO_TITLE[input.memoType];
  const heading = input.courtHeading || COURT_HEADING[input.court as CourtType];
  const lines: string[] = ["بسم الله الرحمن الرحيم", "", title, "", heading];
  if (input.letterhead) lines.push(input.letterhead);
  const procedural = input.procedural || [];
  lines.push("", `المدّعي: ${input.slots.plaintiff}`, `المدّعى عليه: ${input.slots.defendant}`, "", "أولًا: الوقائع", input.slots.facts, "", "ثانيًا: الأسانيد النظامية");
  if (input.notice) lines.push(input.notice);
  else if (input.articles.length === 0 && procedural.length === 0) lines.push("لم يُسترجع من المدونة نص نظامي لهذه الوقائع، فلا يُذكر رقم مادة.");
  else lines.push(...input.articles.flatMap(quoteArticle));
  if (procedural.length > 0) {
    lines.push("", "الأسانيد الإجرائية", ...procedural.flatMap(quoteArticle));
  }
  lines.push("", "ثالثًا: الأسانيد الشرعية");
  if (input.sharia.length === 0) {
    lines.push("لم يُسترجع مصدر شرعي مطابق من المدونة.");
  } else {
    for (const source of input.sharia) {
      const mark = source.isSample ? " [عيّنة فهرس]" : "";
      lines.push(`${source.reference}${mark}: ${source.textAr}`);
      lines.push(`{{cite:sharia:${source.id}:${textHash(source.textAr)}}}`);
      lines.push(`المصدر: ${source.sourceUrl}`);
    }
  }
  lines.push("", "رابعًا: الطلبات", input.slots.requests, "", "والله الموفق.");
  return {
    title,
    body: lines.join("\n"),
    citations: [
      ...input.articles.map((article) => ({ kind: "article" as const, id: article.id, number: article.number })),
      ...procedural.map((article) => ({ kind: "article" as const, id: article.id, number: article.number })),
      ...input.sharia.map((source) => ({ kind: "sharia" as const, id: source.id })),
    ],
  };
}
