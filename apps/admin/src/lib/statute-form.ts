export type ArticleDraft = { number: string; textAr: string };

export type StatuteDraft = {
  key: string;
  nameAr: string;
  sourceUrl: string;
  version: string;
  articles: ArticleDraft[];
};

const CITATION_REQUIRED = "الاستشهاد الرسمي مطلوب.";
const ARTICLES_REQUIRED = "لا توجد مواد. الصق النص الرسمي لكل مادة، أو استورد ملفاً يحتويها.";
const NOT_AN_IMPORT = "الملف ليس نص استيراد رسمي.";

/** Refuse a write the import route would store without a citation or without articles. */
export function pastedStatuteBlock(draft: StatuteDraft): string | null {
  if (!draft.version.trim()) return CITATION_REQUIRED;
  if (draft.articles.length === 0) return ARTICLES_REQUIRED;
  return null;
}

export function statuteImportBody(draft: StatuteDraft) {
  const sourceUrl = draft.sourceUrl.trim();
  const nameAr = draft.nameAr.trim();
  return {
    laws: [
      {
        key: draft.key.trim(),
        nameAr,
        nameEn: nameAr,
        sourceUrl,
        version: draft.version.trim(),
        effectiveDate: null,
        isSample: false,
        citeable: true,
        courts: [] as string[],
        articles: draft.articles.map((article) => {
          const textAr = article.textAr.trim();
          return {
            number: article.number.trim(),
            textAr,
            textEn: textAr,
            sourceUrl,
            isSample: false,
          };
        }),
      },
    ],
  };
}

/**
 * The file is posted unchanged when every statute in it already has a citation and at least one article.
 * Missing source URLs and empty article text are left for the import route to reject.
 */
export function unchangedOfficialImport(text: string): { body: string } | { error: string } {
  const body = text.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { error: NOT_AN_IMPORT };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { error: NOT_AN_IMPORT };
  const laws = (parsed as { laws?: unknown }).laws;
  if (!Array.isArray(laws) || laws.length === 0) return { error: "الملف لا يحتوي نظاماً." };
  for (const law of laws) {
    if (!law || typeof law !== "object") return { error: NOT_AN_IMPORT };
    const row = law as { version?: unknown; articles?: unknown };
    if (typeof row.version !== "string" || !row.version.trim()) return { error: "الاستشهاد الرسمي مطلوب في الملف." };
    if (!Array.isArray(row.articles) || row.articles.length === 0) return { error: "الملف لا يحتوي مواد النظام." };
  }
  return { body };
}

const API_AR: Record<string, string> = {
  "A source URL is required": "رابط المصدر الرسمي مطلوب، ويبدأ بـ http أو https.",
  "Article number and text are required": "رقم المادة ونصها الرسمي مطلوبان.",
  "Official rows require confirmOfficial": "النص الرسمي يحتاج تأكيد أنه من المصدر.",
};

export function statuteError(message: string): string {
  return API_AR[message] || message;
}
