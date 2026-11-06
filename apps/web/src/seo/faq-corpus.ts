import type { Locale } from "@elawyer/types";
import { articleByNumber, lawByKey, textHash, type LawRecord } from "./laws";

export type FaqEntry = {
  id: string;
  questionAr: string;
  questionEn: string;
  lawKey: string;
  articleNumber: string;
};

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: "eos",
    questionAr: "كيف تُحسب مكافأة نهاية الخدمة إذا انتهت علاقة العمل؟",
    questionEn: "How is the end-of-service award calculated when employment ends?",
    lawKey: "labor",
    articleNumber: "المادة الرابعة والثمانون :",
  },
  {
    id: "resign",
    questionAr: "ماذا يستحق العامل من المكافأة إذا استقال؟",
    questionEn: "What share of the award is due if the worker resigns?",
    lawKey: "labor",
    articleNumber: "المادة الخامسة والثمانون :",
  },
  {
    id: "wages-due",
    questionAr: "متى يجب دفع الأجر وتصفية الحقوق بعد انتهاء الخدمة؟",
    questionEn: "When must wages and dues be settled after service ends?",
    lawKey: "labor",
    articleNumber: "المادة الثامنة والثمانون :",
  },
  {
    id: "annual-leave",
    questionAr: "كم تبلغ الإجازة السنوية بأجر؟",
    questionEn: "How long is paid annual leave?",
    lawKey: "labor",
    articleNumber: "المادة التاسعة بعد المائة :",
  },
  {
    id: "maintenance",
    questionAr: "ماذا تشمل النفقة؟",
    questionEn: "What does maintenance include?",
    lawKey: "personal-status",
    articleNumber: "المادة الخامسة والأربعون",
  },
  {
    id: "maintenance-amount",
    questionAr: "كيف تُقدَّر النفقة؟",
    questionEn: "How is the amount of maintenance assessed?",
    lawKey: "personal-status",
    articleNumber: "المادة السادسة والأربعون",
  },
  {
    id: "custody",
    questionAr: "هل يسقط حق الحضانة إذا تركت الأم بيت الزوجية؟",
    questionEn: "Does custody lapse if the mother leaves the marital home?",
    lawKey: "personal-status",
    articleNumber: "المادة الثالثة والثلاثون بعد المائة",
  },
  {
    id: "harassment",
    questionAr: "ما المقصود بجريمة التحرش في النظام؟",
    questionEn: "How does the statute define harassment?",
    lawKey: "harassment",
    articleNumber: "المادة الأولى",
  },
  {
    id: "accident",
    questionAr: "ماذا يلزم السائق إذا كان طرفًا في حادث مروري؟",
    questionEn: "What must a driver do when involved in a traffic accident?",
    lawKey: "traffic",
    articleNumber: "المادة الثالثة والستون",
  },
  {
    id: "rent-renewal",
    questionAr: "متى لا يلزم المؤجر بتجديد عقد الإيجار؟",
    questionEn: "When is a landlord not required to renew a lease?",
    lawKey: "rental-provisions",
    articleNumber: "رابعًا",
  },
];

export type VisibleFaq = {
  id: string;
  question: string;
  answer: string;
  lawName: string;
  articleNumber: string;
  hash: string;
  sourceUrl: string;
};

function quote(law: LawRecord, articleNumber: string): { text: string; hash: string; sourceUrl: string } {
  const article = articleByNumber(law, articleNumber);
  if (!article) throw new Error(`Missing article ${law.key} ${articleNumber}`);
  const text = article.textAr;
  return { text, hash: textHash(text), sourceUrl: article.sourceUrl || law.sourceUrl };
}

export function visibleFaqs(locale: Locale): VisibleFaq[] {
  return FAQ_ENTRIES.map((entry) => {
    const law = lawByKey(entry.lawKey);
    if (!law || law.isSample) throw new Error(`Missing official law ${entry.lawKey}`);
    const cited = quote(law, entry.articleNumber);
    const question = locale === "en" ? entry.questionEn : entry.questionAr;
    const answer = `${cited.text}\n${law.nameAr} — ${entry.articleNumber.trim()} — ${cited.hash}`;
    return {
      id: entry.id,
      question,
      answer,
      lawName: law.nameAr,
      articleNumber: entry.articleNumber.trim(),
      hash: cited.hash,
      sourceUrl: cited.sourceUrl,
    };
  });
}
