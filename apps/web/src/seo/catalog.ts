import { COURTS, LOCALES, type CourtType, type Locale } from "@elawyer/types";

export const TOP_IDS = ["pricing", "faq", "privacy", "terms", "about", "contact", "search"] as const;
export type TopId = (typeof TOP_IDS)[number];

export const DOC_IDS = ["lawsuit", "defense", "reply", "objection"] as const;
export type DocId = (typeof DOC_IDS)[number];

export const SECTION_IDS = ["documents", "courts"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export type PageRef =
  | { kind: "home" }
  | { kind: "top"; id: TopId }
  | { kind: "doc"; id: DocId }
  | { kind: "court"; id: CourtType };

type SlugId = TopId | DocId | SectionId | CourtType;

const SLUGS: Record<SlugId, Record<Locale, string>> = {
  pricing: { ar: "الأسعار", en: "pricing", ur: "قیمتیں", hi: "मूल्य", pa: "قیمتاں", si: "මිල", bn: "মূল্য", ne: "मूल्य", fil: "presyo", tr: "fiyatlar", am: "ዋጋ" },
  faq: { ar: "الأسئلة", en: "questions", ur: "سوالات", hi: "प्रश्न", pa: "سوال", si: "ප්‍රශ්න", bn: "প্রশ্ন", ne: "प्रश्नहरू", fil: "tanong", tr: "sorular", am: "ጥያቄ" },
  privacy: { ar: "الخصوصية", en: "privacy", ur: "رازداری", hi: "गोपनीयता", pa: "نجی", si: "පෞද්ගලික", bn: "গোপনীয়তা", ne: "गोपनीयता", fil: "pribasidad", tr: "gizlilik", am: "ግላዊነት" },
  terms: { ar: "الشروط", en: "terms", ur: "شرائط", hi: "शर्तें", pa: "شرطاں", si: "කොන්දේසි", bn: "শর্ত", ne: "सर्त", fil: "tuntunin", tr: "koşullar", am: "ውል" },
  about: { ar: "عن-المنصة", en: "about", ur: "تعارف", hi: "परिचय", pa: "جان-پچھان", si: "අපි-ගැන", bn: "পরিচিতি", ne: "बारेमा", fil: "tungkol", tr: "hakkında", am: "ስለ" },
  contact: { ar: "تواصل", en: "contact", ur: "رابطہ", hi: "संपर्क", pa: "رابطہ", si: "සම්බන්ධ", bn: "যোগাযোগ", ne: "सम्पर्क", fil: "ugnayan", tr: "iletişim", am: "ግንኙነት" },
  search: { ar: "بحث", en: "search", ur: "تلاش", hi: "खोज", pa: "کھوج", si: "සෙවුම", bn: "অনুসন্ধান", ne: "खोज", fil: "hanap", tr: "arama", am: "ፍለጋ" },
  documents: { ar: "المذكرات", en: "documents", ur: "دستاویزات", hi: "दस्तावेज", pa: "دستاویز", si: "ලේඛන", bn: "নথি", ne: "कागजात", fil: "dokumento", tr: "belgeler", am: "ሰነድ" },
  courts: { ar: "المحاكم", en: "courts", ur: "عدالتیں", hi: "न्यायालय", pa: "عدالتاں", si: "අධිකරණ", bn: "আদালত", ne: "अदालत", fil: "hukuman", tr: "mahkemeler", am: "ፍርድ-ቤት" },
  lawsuit: { ar: "صحيفة-دعوى", en: "lawsuit", ur: "دعوی", hi: "दावा", pa: "دعویٰ", si: "නඩුව", bn: "মামলা", ne: "मुद्दा", fil: "demanda", tr: "dava", am: "ክስ" },
  defense: { ar: "مذكرة-دفاع", en: "defense", ur: "دفاع", hi: "बचाव", pa: "بچاؤ", si: "ආරක්ෂාව", bn: "প্রতিরক্ষা", ne: "प्रतिरक्षा", fil: "depensa", tr: "savunma", am: "መከላከያ" },
  reply: { ar: "مذكرة-جوابية", en: "reply", ur: "جواب", hi: "उत्तर", pa: "جواب", si: "පිළිතුර", bn: "জবাব", ne: "जवाफ", fil: "sagot", tr: "cevap", am: "ምላሽ" },
  objection: { ar: "لائحة-اعتراضية", en: "objection", ur: "اعتراض", hi: "आपत्ति", pa: "اعتراض", si: "විරෝධය", bn: "আপত্তি", ne: "आपत्ति", fil: "tutol", tr: "itiraz", am: "ተቃውሞ" },
  general: { ar: "عامة", en: "general", ur: "عام", hi: "सामान्य", pa: "عام", si: "සාමාන්‍ය", bn: "সাধারণ", ne: "सामान्य", fil: "pangkalahatan", tr: "genel", am: "አጠቃላይ" },
  criminal: { ar: "جزائية", en: "criminal", ur: "فوجداری", hi: "आपराधिक", pa: "فوجداری", si: "අපරාධ", bn: "ফৌজদারি", ne: "फौजदारी", fil: "kriminal", tr: "ceza", am: "ወንጀል" },
  personal_status: { ar: "أحوال-شخصية", en: "personal-status", ur: "احوال-شخصیہ", hi: "पारिवारिक", pa: "احوال", si: "පවුල", bn: "পারিবারিক", ne: "पारिवारिक", fil: "pampamilya", tr: "aile", am: "ቤተሰብ" },
  labor: { ar: "عمالية", en: "labor", ur: "لیبر", hi: "श्रम", pa: "مزدور", si: "කම්කරු", bn: "শ্রম", ne: "श्रम", fil: "paggawa", tr: "iş", am: "ሥራ" },
  commercial: { ar: "تجارية", en: "commercial", ur: "تجارتی", hi: "वाणिज्य", pa: "تجارتی", si: "වාණිජ", bn: "বাণিজ্য", ne: "वाणिज्य", fil: "komersiyo", tr: "ticaret", am: "ንግድ" },
  enforcement: { ar: "تنفيذ", en: "enforcement", ur: "تنفیذ", hi: "प्रवर्तन", pa: "تنفیذ", si: "බලාත්මක", bn: "প্রয়োগ", ne: "कार्यान्वयन", fil: "pagpapatupad", tr: "icra", am: "አፈጻጸም" },
  administrative: { ar: "مظالم", en: "administrative", ur: "انتظامی", hi: "प्रशासनिक", pa: "انتظامی", si: "පරිපාලන", bn: "প্রশাসনিক", ne: "प्रशासन", fil: "administratibo", tr: "idare", am: "አስተዳደር" },
  appeal: { ar: "استئناف", en: "appeal", ur: "اپیل", hi: "अपील", pa: "اپیل", si: "අභියාචන", bn: "আপিল", ne: "पुनरावेदन", fil: "apela", tr: "istinaf", am: "ይግባኝ" },
  supreme: { ar: "عليا", en: "supreme", ur: "سپریم", hi: "उच्चतम", pa: "اعلیٰ", si: "උත්තරීතර", bn: "সর্বোচ্চ", ne: "सर्वोच्च", fil: "kataas-taasan", tr: "yargıtay", am: "የበላይ" },
};

const RESERVED = new Set([
  "login",
  "signup",
  "otp",
  "forgot",
  "reset",
  "pay",
  "app",
  "api",
  "admin",
  "q",
  "icon",
  "apple-icon",
  "opengraph-image",
  "memos",
  "wallet",
  "saved",
  "integrations",
  ...LOCALES,
]);

export function isKnownLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function slug(locale: Locale, id: SlugId): string {
  return SLUGS[id][locale];
}

export function publicPages(): PageRef[] {
  return [
    { kind: "home" },
    ...TOP_IDS.map((id) => ({ kind: "top" as const, id })),
    ...DOC_IDS.map((id) => ({ kind: "doc" as const, id })),
    ...COURTS.map((id) => ({ kind: "court" as const, id })),
  ];
}

export function slugParts(locale: Locale, page: PageRef): string[] {
  if (page.kind === "home") return [];
  if (page.kind === "top") return [slug(locale, page.id)];
  if (page.kind === "doc") return [slug(locale, "documents"), slug(locale, page.id)];
  return [slug(locale, "courts"), slug(locale, page.id)];
}

export function pagePath(locale: Locale, page: PageRef): string {
  const parts = slugParts(locale, page);
  const prefix = locale === "ar" ? "" : `/${locale}`;
  if (parts.length === 0) return prefix || "/";
  return `${prefix}/${parts.join("/")}`;
}

export function authPath(locale: Locale, path: "/login" | "/signup" | "/app"): string {
  return locale === "ar" ? path : `/${locale}${path}`;
}

function findId<T extends string>(locale: Locale, ids: readonly T[], value: string): T | null {
  return ids.find((id) => slug(locale, id as SlugId) === value) ?? null;
}

export function resolveSlug(locale: Locale, parts: string[]): PageRef | null {
  if (parts.length === 1) {
    const id = findId(locale, TOP_IDS, parts[0]);
    return id ? { kind: "top", id } : null;
  }
  if (parts.length === 2 && parts[0] === slug(locale, "documents")) {
    const id = findId(locale, DOC_IDS, parts[1]);
    return id ? { kind: "doc", id } : null;
  }
  if (parts.length === 2 && parts[0] === slug(locale, "courts")) {
    const id = findId(locale, COURTS, parts[1]);
    return id ? { kind: "court", id } : null;
  }
  return null;
}

export function samePage(left: PageRef, right: PageRef): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "home" || right.kind === "home") return left.kind === right.kind;
  return left.id === right.id;
}

export function slugProblems(): string[] {
  const problems: string[] = [];
  for (const locale of LOCALES) {
    const first = new Map<string, string>();
    for (const id of [...TOP_IDS, ...SECTION_IDS]) {
      const value = slug(locale, id);
      if (!value || /[/\s?#]/.test(value) || value === "." || value === "..") problems.push(`${locale} ${id} invalid`);
      if (RESERVED.has(value)) problems.push(`${locale} ${id} reserved ${value}`);
      const prior = first.get(value);
      if (prior) problems.push(`${locale} ${value} used by ${prior} and ${id}`);
      first.set(value, id);
    }
    for (const [label, ids] of [
      ["doc", DOC_IDS],
      ["court", COURTS],
    ] as const) {
      const seen = new Set<string>();
      for (const id of ids) {
        const value = slug(locale, id);
        if (!value || /[/\s?#]/.test(value)) problems.push(`${locale} ${label} ${id} invalid`);
        if (RESERVED.has(value)) problems.push(`${locale} ${label} ${id} reserved`);
        if (seen.has(value)) problems.push(`${locale} ${label} duplicate ${value}`);
        seen.add(value);
      }
    }
  }
  return problems;
}

export function lighthousePaths(): string[] {
  const paths = publicPages().map((page) => pagePath("ar", page));
  for (const locale of LOCALES) {
    if (locale === "ar") continue;
    paths.push(pagePath(locale, { kind: "home" }));
  }
  return paths;
}
