import type { CourtType, MemoType } from "@elawyer/types";
import type { RetrievedArticle, RetrievedSharia } from "./draft";

export interface GroundArticle extends RetrievedArticle {
  lawKey: string;
}

export interface GroundDecision {
  substantive: RetrievedArticle[];
  procedural: RetrievedArticle[];
  sharia: RetrievedSharia[];
  notice: string | null;
}

export const CRIMINAL_TOPICS: { key: string; nameAr: string; pattern: RegExp }[] = [
  { key: "narcotics", nameAr: "نظام مكافحة المخدرات والمؤثرات العقلية", pattern: /مخدر|مؤثرات عقلية|مؤثر عقلي/ },
  { key: "bribery", nameAr: "نظام مكافحة الرشوة", pattern: /رشوة|مرتش|راشي/ },
  { key: "forgery", nameAr: "النظام الجزائي لجرائم التزوير", pattern: /تزوير|مزور/ },
  { key: "money-laundering", nameAr: "نظام مكافحة غسل الأموال", pattern: /غسل الأموال|غسل اموال|متحصلات الجريمة/ },
  { key: "terrorism", nameAr: "نظام مكافحة جرائم الإرهاب وتمويله", pattern: /إرهاب|ارهاب|تمويل الإرهاب/ },
  { key: "juveniles", nameAr: "نظام الأحداث", pattern: /قاصر|لم يتم الثامنة عشرة|دار الأحداث/ },
  { key: "weapons", nameAr: "نظام الأسلحة والذخائر", pattern: /سلاح ناري|ذخيرة|بندقية|مسدس/ },
  { key: "abuse", nameAr: "نظام الحماية من الإيذاء", pattern: /إيذاء|عنف أسري/ },
  { key: "trafficking", nameAr: "نظام مكافحة جرائم الاتجار بالأشخاص", pattern: /اتجار بالأشخاص|اتجار بالبشر/ },
  { key: "traffic", nameAr: "نظام المرور", pattern: /حادث سير|مخالفة مرورية|رخصة قيادة/ },
  { key: "cybercrime", nameAr: "نظام مكافحة جرائم المعلوماتية", pattern: /جرائم معلوماتية|اختراق|شبكة معلوماتية/ },
  { key: "harassment", nameAr: "نظام مكافحة جريمة التحرش", pattern: /تحرش/ },
  { key: "financial-fraud", nameAr: "نظام مكافحة الاحتيال المالي وخيانة الأمانة", pattern: /احتيال مالي|خيانة الأمانة/ },
  { key: "commercial-fraud", nameAr: "نظام مكافحة الغش التجاري", pattern: /غش تجاري/ },
];

const CRIMINAL_KEYS = CRIMINAL_TOPICS.map((topic) => topic.key);

const EXTRA_TOPICS: { key: string; nameAr: string; pattern: RegExp; courts: string[] }[] = [
  { key: "arbitration", nameAr: "نظام التحكيم", pattern: /تحكيم|هيئة التحكيم|شرط التحكيم/, courts: ["general", "commercial", "appeal"] },
  { key: "bog", nameAr: "نظام ديوان المظالم", pattern: /ديوان المظالم|المحكمة الإدارية العليا/, courts: ["administrative", "appeal", "supreme"] },
  { key: "bog-enforcement", nameAr: "نظام التنفيذ أمام ديوان المظالم", pattern: /محكمة التنفيذ الإدارية|تنفيذ أمام ديوان|سند تنفيذي/, courts: ["administrative", "enforcement"] },
  { key: "court-costs", nameAr: "نظام التكاليف القضائية", pattern: /تكاليف قضائية/, courts: ["general", "commercial", "personal_status", "labor", "administrative", "criminal"] },
  { key: "competition", nameAr: "نظام المنافسة", pattern: /وضع مهيمن|تركز اقتصادي|ممارسات احتكارية|الهيئة العامة للمنافسة/, courts: ["commercial", "administrative"] },
  { key: "personal-data", nameAr: "نظام حماية البيانات الشخصية", pattern: /بيانات شخصية|صاحب البيانات/, courts: ["general", "commercial", "administrative"] },
  { key: "capital-market", nameAr: "نظام السوق المالية", pattern: /سوق مالية|أوراق مالية|هيئة السوق/, courts: ["commercial"] },
  { key: "electronic-transactions", nameAr: "نظام التعاملات الإلكترونية", pattern: /تعامل إلكتروني|توقيع إلكتروني|تصديق رقمي/, courts: ["commercial", "general"] },
  { key: "ecommerce", nameAr: "نظام التجارة الإلكترونية", pattern: /تجارة إلكترونية|موفر الخدمة/, courts: ["commercial"] },
  { key: "commercial-register", nameAr: "نظام السجل التجاري", pattern: /سجل تجاري/, courts: ["commercial"] },
  { key: "trademarks", nameAr: "نظام العلامات التجارية", pattern: /علامة تجارية|علامات تجارية/, courts: ["commercial"] },
  { key: "commercial-agencies", nameAr: "نظام الوكالات التجارية", pattern: /وكالة تجارية|وكيل تجاري/, courts: ["commercial"] },
  { key: "civil-service", nameAr: "نظام الخدمة المدنية", pattern: /خدمة مدنية|وظيفة عامة/, courts: ["administrative"] },
  { key: "procurement", nameAr: "نظام المنافسات والمشتريات الحكومية", pattern: /مشتريات حكومية|منافسة حكومية|ضمان ابتدائي/, courts: ["administrative", "commercial"] },
  { key: "social-insurance", nameAr: "نظام التأمينات الاجتماعية", pattern: /تأمينات اجتماعية|اشتراك تأميني/, courts: ["labor", "general"] },
  { key: "real-estate-registration", nameAr: "نظام التسجيل العيني للعقار", pattern: /تسجيل عيني|سجل عقاري/, courts: ["general"] },
  { key: "expropriation", nameAr: "نظام نزع ملكية العقارات للمنفعة العامة ووضع اليد المؤقت على العقار", pattern: /نزع ملكية|منفعة عامة/, courts: ["administrative", "general"] },
  { key: "discipline", nameAr: "نظام الانضباط الوظيفي", pattern: /انضباط وظيفي|مخالفة تأديبية|كف اليد/, courts: ["administrative"] },
  { key: "notary", nameAr: "نظام التوثيق", pattern: /كاتب عدل|كاتب العدل|موثق/, courts: ["general", "personal_status"] },
];

const SUBJECTS: Record<CourtType, { keys: string[]; nameAr: string }> = {
  labor: { keys: ["labor"], nameAr: "نظام العمل" },
  commercial: {
    keys: ["companies", "commercial-papers", "bankruptcy", "commercial-fraud", "civil-transactions"],
    nameAr: "الأنظمة التجارية",
  },
  criminal: { keys: CRIMINAL_KEYS, nameAr: "الأنظمة الجزائية" },
  personal_status: { keys: ["personal-status"], nameAr: "نظام الأحوال الشخصية" },
  enforcement: { keys: ["enforcement"], nameAr: "نظام التنفيذ" },
  administrative: { keys: ["bog-procedure"], nameAr: "نظام المرافعات أمام ديوان المظالم" },
  general: { keys: ["civil-transactions"], nameAr: "نظام المعاملات المدنية" },
  appeal: { keys: ["sharia-procedure"], nameAr: "نظام المرافعات الشرعية" },
  supreme: { keys: ["sharia-procedure"], nameAr: "نظام المرافعات الشرعية" },
};

export const PROCEDURAL_KEYS = [
  "evidence",
  "sharia-procedure",
  "sharia-procedure-regulation",
  "criminal-procedure",
  "criminal-procedure-regulation",
  "commercial-courts",
  "commercial-courts-regulation",
] as const;

const PROCEDURAL = new Set<string>(PROCEDURAL_KEYS);

const STOP = new Set(
  "في من على إلى الى عن مع أو او ثم قد كان كانت يكون تكون هذا هذه ذلك تلك الذي التي الذين كل كما غير بعد قبل عند لدى دون لم لن لا إن ان أن اذا إذا أي بين وهو وهي هو هي تم خلال حيث بينه عليه عليها لهم لها وما وماذا هناك هنا سوف قد وقد".split(/\s+/),
);

export function isProceduralKey(key: string): boolean {
  return PROCEDURAL.has(key);
}

export function courtSubject(court: string): { keys: string[]; nameAr: string } | null {
  return SUBJECTS[court as CourtType] ?? null;
}

export function missingStatuteNotice(nameAr: string): string {
  return `${nameAr} غير موجود في قاعدة النصوص الموثقة بعد، ولم يُضف سند نظامي.`;
}

export function searchStems(text: string): string[] {
  const seen = new Set<string>();
  const stems: string[] = [];
  for (const token of text.split(/[^\u0621-\u064A]+/)) {
    const stem = token.replace(/^(?:ال|وال|بال|كال|فال|لل)/, "");
    if (stem.length < 3 || STOP.has(stem) || seen.has(stem)) continue;
    seen.add(stem);
    stems.push(stem);
  }
  return stems;
}

function folded(token: string): string {
  return token
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/^(?:ال|وال|بال|كال|فال|لل)/, "")
    .replace(/^[وفبلك]/, "");
}

function stemsOf(text: string): string[] {
  const seen = new Set<string>();
  for (const token of text.split(/[^\u0621-\u064A\u064B-\u0652\u0670]+/)) {
    const stem = folded(token);
    if (stem.length < 3 || STOP.has(stem)) continue;
    seen.add(stem);
  }
  return [...seen];
}

export function overlapScore(facts: string, text: string): { shared: number; ratio: number } {
  const left = new Set(stemsOf(facts));
  const right = stemsOf(text);
  if (right.length === 0 || left.size === 0) return { shared: 0, ratio: 0 };
  const shared = right.filter((stem) => left.has(stem)).length;
  return { shared, ratio: shared / right.length };
}

export function clearsRelevance(facts: string, text: string): boolean {
  const score = overlapScore(facts, text);
  return score.shared >= 3 && score.ratio >= 0.2;
}

export function proceduralContext(facts: string, memoType: string): boolean {
  if (memoType === "appeal") return true;
  return /إثبات|بيّ?نة|يمين|تبليغ|اختصاص|بطلان|مرافع|إعلان|شهادة/.test(facts);
}

export function isFillerCitation(reference: string, text: string): boolean {
  if (/^1:1(?:\b|[\s:—-]|$)/.test(reference.trim())) return true;
  const bare = text.replace(/[\u064B-\u0652\u0670\u0640\s]/g, "");
  return bare === "بسماللهالرحمنالرحيم";
}

function keepRelevant<T extends { id: string; textAr: string }>(facts: string, rows: T[]): T[] {
  const ranked = rows
    .map((row) => ({ row, score: overlapScore(facts, row.textAr) }))
    .filter((item) => clearsRelevance(facts, item.row.textAr))
    .sort((a, b) => b.score.shared - a.score.shared || b.score.ratio - a.score.ratio);
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const item of ranked) {
    if (seen.has(item.row.id)) continue;
    seen.add(item.row.id);
    kept.push(item.row);
  }
  return kept;
}

export function selectGrounds(input: {
  court: string;
  memoType: MemoType | string;
  facts: string;
  articles: GroundArticle[];
  sharia: RetrievedSharia[];
  presentLawKeys: string[];
}): GroundDecision {
  const subject = courtSubject(input.court);
  const catalog = input.court === "criminal" ? CRIMINAL_TOPICS : EXTRA_TOPICS.filter((topic) => topic.courts.includes(input.court));
  const topics = catalog.filter((topic) => topic.pattern.test(input.facts));
  const defined = topics.length ? topics.map((topic) => topic.key) : subject?.keys || [];
  const noticeName = topics.length ? topics.map((topic) => topic.nameAr).join("، ") : subject?.nameAr || "";
  const present = defined.some((key) => input.presentLawKeys.includes(key));
  const subjectKeys = new Set(defined.filter((key) => !isProceduralKey(key)));
  const substantive = present
    ? keepRelevant(
        input.facts,
        input.articles.filter((article) => subjectKeys.has(article.lawKey)),
      ).slice(0, 2)
    : [];
  const procedural = proceduralContext(input.facts, input.memoType)
    ? keepRelevant(
        input.facts,
        input.articles.filter((article) => isProceduralKey(article.lawKey)),
      ).slice(0, 2)
    : [];
  const sharia = keepRelevant(
    input.facts,
    input.sharia.filter((source) => !isFillerCitation(source.reference, source.textAr)),
  ).slice(0, 1);
  let notice: string | null = null;
  if (subject && !present) notice = missingStatuteNotice(noticeName);
  else if (subject && substantive.length === 0 && procedural.length === 0) notice = "لم يُضف سند نظامي لأن المواد المحفوظة لا تطابق هذه الوقائع.";
  return { substantive, procedural, sharia, notice };
}
