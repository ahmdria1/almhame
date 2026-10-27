import type { CourtType, MemoType } from "@elawyer/types";
import type { CitationRef } from "./citations";

export interface RetrievedArticle {
  id: string;
  number: string;
  textAr: string;
  textEn: string;
  lawNameAr: string;
  lawNameEn: string;
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

export function readSlots(userTexts: string[]): DraftSlots & { ready: boolean; question: string } {
  const joined = userTexts.map((line) => line.trim()).filter(Boolean).join("\n");
  const plaintiff = joined.match(/المدعي\s*[:：]\s*([^\n]+)/)?.[1]?.trim();
  const defendant = joined.match(/المدعى عليه\s*[:：]\s*([^\n]+)/)?.[1]?.trim();
  const requests = joined.match(/الطلبات\s*[:：]\s*([^\n]+)/)?.[1]?.trim();
  const facts = joined;
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
      question: "من المدعي؟ أجب بالصيغة: المدعي: الاسم.",
    };
  }
  if (!defendant) {
    return {
      plaintiff,
      defendant: "",
      facts,
      requests: requests || "",
      ready: false,
      question: "من المدعى عليه؟ أجب بالصيغة: المدعى عليه: الاسم.",
    };
  }
  return {
    plaintiff,
    defendant,
    facts,
    requests: requests || "الحكم وفق الوقائع، مع تحميل المدعى عليه الرسوم.",
    ready: true,
    question: "الوقائع كافية للصياغة. راجع المذكرة بعد إنشائها، ولا تودعها قبل مطابقة المصادر.",
  };
}

export function composeDraft(input: {
  court: CourtType;
  memoType: MemoType;
  slots: DraftSlots;
  articles: RetrievedArticle[];
  sharia: RetrievedSharia[];
  letterhead?: string | null;
}): { title: string; body: string; citations: CitationRef[] } {
  const title = MEMO_TITLE[input.memoType];
  const lines: string[] = ["بسم الله الرحمن الرحيم", "", title, "", COURT_HEADING[input.court]];
  if (input.letterhead) lines.push(input.letterhead);
  lines.push("", `المدعي: ${input.slots.plaintiff}`, `المدعى عليه: ${input.slots.defendant}`, "", "أولًا: الوقائع", input.slots.facts, "", "ثانيًا: الأسانيد النظامية");
  if (input.articles.length === 0) {
    lines.push("لم يُسترجع من المدونة نص نظامي لهذه الوقائع، فلا يُذكر رقم مادة.");
  } else {
    for (const article of input.articles) {
      const mark = article.isSample ? " [عيّنة غير رسمية]" : "";
      lines.push(`المادة (${article.number}) من ${article.lawNameAr}${mark}: ${article.textAr}`);
      lines.push(`{{cite:article:${article.id}}}`);
      lines.push(`المصدر: ${article.sourceUrl} — ${article.version} — ${article.effectiveDate}`);
    }
  }
  lines.push("", "ثالثًا: الأسانيد الشرعية");
  if (input.sharia.length === 0) {
    lines.push("لم يُسترجع مصدر شرعي مطابق من المدونة.");
  } else {
    for (const source of input.sharia) {
      const mark = source.isSample ? " [عيّنة فهرس]" : "";
      lines.push(`${source.reference}${mark}: ${source.textAr}`);
      lines.push(`{{cite:sharia:${source.id}}}`);
      lines.push(`المصدر: ${source.sourceUrl}`);
    }
  }
  lines.push("", "رابعًا: الطلبات", input.slots.requests, "", "والله الموفق.");
  return {
    title,
    body: lines.join("\n"),
    citations: [
      ...input.articles.map((article) => ({ kind: "article" as const, id: article.id, number: article.number })),
      ...input.sharia.map((source) => ({ kind: "sharia" as const, id: source.id })),
    ],
  };
}
