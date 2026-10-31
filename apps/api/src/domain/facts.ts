const NUMBER = /[0-9\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF]+(?:[.,][0-9\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF]+)?/g;
const DATE = /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/g;

const NAME_PATTERNS = [
  /(?:my name is|name is)\s+([A-Za-z][A-Za-z'’-]*(?:\s+[A-Za-z][A-Za-z'’-]*)?)/i,
  /Adım\s+([A-Za-zÇĞİÖŞÜçğıöşü]{2,40})/,
  /নাম\s+([^\s।,.]{2,40})/,
  /नाम\s+([^\s।,.]{2,40})/,
  /نام\s+([^\s،.]{2,40})/,
  /اسمي\s+([^\s،.]{2,40})/,
  /المدع[يى]:\s*([^\n]+)/,
];

function pushToken(found: string[], value: string) {
  const clean = value.trim().replace(/[।،,.]+$/g, "").trim();
  if (clean && !found.includes(clean)) found.push(clean);
}

export function preservedTokens(text: string): string[] {
  const found: string[] = [];
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) pushToken(found, match[1]);
  }
  for (const match of text.match(DATE) || []) pushToken(found, match);
  for (const match of text.match(NUMBER) || []) pushToken(found, match);
  return found;
}

export function hasDate(text: string): boolean {
  return /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(text);
}

export function arabicFacts(text: string): string {
  const tokens = preservedTokens(text);
  const fixed = tokens.length ? `الثوابت كما وردت دون تعديل: ${tokens.join("، ")}.` : "";
  return ["أفاد صاحب الشأن بالواقعة، وتُحفظ الأسماء والمبالغ والتواريخ بلفظها.", fixed].filter(Boolean).join("\n");
}

export const MEMO_DISCLAIMER =
  "تنبيه: هذه المذكرة مساعدة في ترتيب الصياغة لشخص غير مختص، وليست استشارة من محامٍ مرخص، ولا ضمانًا لنتيجة. راجعها وطابق المصادر قبل إيداعها.";
