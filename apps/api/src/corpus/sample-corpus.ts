import { COURTS, type CourtType } from "@elawyer/types";

export interface SampleArticle {
  number: string;
  textAr: string;
  textEn: string;
  sourceUrl: string;
}

export interface SampleLaw {
  key: string;
  nameAr: string;
  nameEn: string;
  sourceUrl: string;
  version: string;
  effectiveDate: string;
  isSample: true;
  courts: CourtType[];
  articles: SampleArticle[];
}

export interface SampleSharia {
  key: string;
  kind: "quran" | "hadith" | "fiqh";
  reference: string;
  textAr: string;
  textEn: string;
  sourceUrl: string;
  isSample: true;
  courts: CourtType[];
}

const note = "هذا النص عيّنة غير رسمية للاختبار ولا يُحتج به أمام القضاء.";

function article(court: string, number: string, topicAr: string, topicEn: string): SampleArticle {
  return {
    number,
    textAr: `${note} موضوع العيّنة: ${topicAr}.`,
    textEn: `Sample catalog text, not an official statute. Topic: ${topicEn}.`,
    sourceUrl: `https://example.sa/sample-corpus/${court}/${number}`,
  };
}

export const SAMPLE_LAWS: SampleLaw[] = [
  {
    key: "sample-labor",
    nameAr: "عيّنة — نموذج عمل (ليس نصًا رسميًا)",
    nameEn: "Sample labor catalog (not an official text)",
    sourceUrl: "https://example.sa/sample-corpus/labor",
    version: "sample-1",
    effectiveDate: "2026-01-01",
    isSample: true,
    courts: ["labor"],
    articles: [
      article("labor", "77", "إنهاء العقد لسبب غير مشروع والتعويض", "ending a contract and compensation"),
      article("labor", "84", "مكافأة نهاية الخدمة عند انتهاء العلاقة", "end of service award"),
      article("labor", "80", "الأسباب التي تبرر إنهاء العقد في هذه العيّنة", "grounds that justify ending the contract in this sample"),
    ],
  },
  {
    key: "sample-general",
    nameAr: "عيّنة — نموذج عام (ليس نصًا رسميًا)",
    nameEn: "Sample general catalog",
    sourceUrl: "https://example.sa/sample-corpus/general",
    version: "sample-1",
    effectiveDate: "2026-01-01",
    isSample: true,
    courts: ["general"],
    articles: [article("general", "1", "رفع الدعوى أمام المحكمة العامة في هذه العيّنة", "filing before the general court in this sample")],
  },
  {
    key: "sample-criminal",
    nameAr: "عيّنة — نموذج جزائي (ليس نصًا رسميًا)",
    nameEn: "Sample criminal catalog",
    sourceUrl: "https://example.sa/sample-corpus/criminal",
    version: "sample-1",
    effectiveDate: "2026-01-01",
    isSample: true,
    courts: ["criminal"],
    articles: [article("criminal", "3", "وصف الواقعة الجزائية في هذه العيّنة", "describing a criminal fact pattern in this sample")],
  },
  {
    key: "sample-personal",
    nameAr: "عيّنة — نموذج أحوال (ليس نصًا رسميًا)",
    nameEn: "Sample personal-status catalog",
    sourceUrl: "https://example.sa/sample-corpus/personal",
    version: "sample-1",
    effectiveDate: "2026-01-01",
    isSample: true,
    courts: ["personal_status"],
    articles: [article("personal", "12", "طلبات الأحوال الشخصية في هذه العيّنة", "personal-status requests in this sample")],
  },
  {
    key: "sample-commercial",
    nameAr: "عيّنة — نموذج تجاري (ليس نصًا رسميًا)",
    nameEn: "Sample commercial catalog",
    sourceUrl: "https://example.sa/sample-corpus/commercial",
    version: "sample-1",
    effectiveDate: "2026-01-01",
    isSample: true,
    courts: ["commercial"],
    articles: [article("commercial", "5", "التزام عقدي تجاري في هذه العيّنة", "a commercial contract duty in this sample")],
  },
  {
    key: "sample-enforcement",
    nameAr: "عيّنة — نموذج تنفيذ (ليس نصًا رسميًا)",
    nameEn: "Sample enforcement catalog",
    sourceUrl: "https://example.sa/sample-corpus/enforcement",
    version: "sample-1",
    effectiveDate: "2026-01-01",
    isSample: true,
    courts: ["enforcement"],
    articles: [article("enforcement", "9", "طلب تنفيذ سند في هذه العيّنة", "enforcing an instrument in this sample")],
  },
  {
    key: "sample-admin",
    nameAr: "عيّنة — نموذج ديوان المظالم (ليس نصًا رسميًا)",
    nameEn: "Sample administrative catalog",
    sourceUrl: "https://example.sa/sample-corpus/administrative",
    version: "sample-1",
    effectiveDate: "2026-01-01",
    isSample: true,
    courts: ["administrative"],
    articles: [article("administrative", "4", "قرار إداري في هذه العيّنة", "an administrative decision in this sample")],
  },
  {
    key: "sample-appeal",
    nameAr: "عيّنة — نموذج استئناف (ليس نصًا رسميًا)",
    nameEn: "Sample appeal catalog",
    sourceUrl: "https://example.sa/sample-corpus/appeal",
    version: "sample-1",
    effectiveDate: "2026-01-01",
    isSample: true,
    courts: ["appeal"],
    articles: [article("appeal", "15", "أسباب الاعتراض في هذه العيّنة", "grounds of objection in this sample")],
  },
  {
    key: "sample-supreme",
    nameAr: "عيّنة — نموذج المحكمة العليا (ليس نصًا رسميًا)",
    nameEn: "Sample supreme-court catalog",
    sourceUrl: "https://example.sa/sample-corpus/supreme",
    version: "sample-1",
    effectiveDate: "2026-01-01",
    isSample: true,
    courts: ["supreme"],
    articles: [article("supreme", "2", "سبب يتعلق بتطبيق القاعدة في هذه العيّنة", "a sample ground about applying a rule")],
  },
];

export const SAMPLE_SHARIA: SampleSharia[] = [
  {
    key: "sample-fiqh-la-darar",
    kind: "fiqh",
    reference: "القاعدة الفقهية: لا ضرر ولا ضرار",
    textAr: "سجل عيّنة للفهرس يشير إلى القاعدة الفقهية المشهورة «لا ضرر ولا ضرار»، وليس طبعة معتمدة.",
    textEn: "Sample index row for the well-known maxim. Not a critical edition.",
    sourceUrl: "https://example.sa/sample-corpus/sharia/la-darar",
    isSample: true,
    courts: [...COURTS],
  },
  {
    key: "sample-quran-5-1",
    kind: "quran",
    reference: "سورة المائدة: 1",
    textAr: "يَا أَيُّهَا الَّذِينَ آمَنُوا أَوْفُوا بِالْعُقُودِ",
    textEn: "Sample catalog pointer to Quran 5:1. The verse text is quoted; this row is not a mushaf edition.",
    sourceUrl: "https://quran.com/5/1",
    isSample: true,
    courts: [...COURTS],
  },
  {
    key: "sample-hadith-la-darar",
    kind: "hadith",
    reference: "حديث «لا ضرر ولا ضرار» — قيد فهرس عيّنة",
    textAr: "سجل عيّنة يشير إلى الحديث المشهور «لا ضرر ولا ضرار» دون إيراد سند أو تخريج. ليس هذا السجل مصدرًا حديثيًا معتمدًا.",
    textEn: "Sample index pointer naming a well-known hadith without a chain or takhrij.",
    sourceUrl: "https://example.sa/sample-corpus/sharia/hadith-la-darar",
    isSample: true,
    courts: [...COURTS],
  },
];
