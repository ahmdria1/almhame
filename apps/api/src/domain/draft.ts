import type { CourtType, MemoType } from "@elawyer/types";
import type { CitationRef } from "./citations";
import { humanMemo, type DraftPacket } from "./draft-guard";

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

export interface RetrievedJudgment {
  id: string;
  judgmentNo: string;
  court: string;
  city: string;
  caseNo: string;
  judgmentDateHijri: string;
  judgmentDateGregorian: string;
  title: string;
  fullText: string;
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
  traffic: "فضيلة رئيس المحكمة المرورية",
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

export function composeDraft(input: DraftPacket): { title: string; body: string; citations: CitationRef[] } {
  const packet: DraftPacket = {
    ...input,
    title: input.title || MEMO_TITLE[input.memoType],
    courtHeading: input.courtHeading || COURT_HEADING[input.court as CourtType],
  };
  return humanMemo(packet);
}
