import type { MemoType } from "@elawyer/types";
import { citationLabel } from "./article-numbers";
import { normalizeCitationText, textHash, type CitationRef } from "./citations";
import type { DraftSlots, RetrievedArticle, RetrievedJudgment, RetrievedSharia } from "./draft";

export interface DraftPacket {
  court: string;
  memoType: MemoType;
  slots: DraftSlots;
  articles: RetrievedArticle[];
  procedural?: RetrievedArticle[];
  sharia: RetrievedSharia[];
  judgments?: RetrievedJudgment[];
  notice?: string | null;
  letterhead?: string | null;
  title?: string;
  courtHeading?: string;
}

export interface SettledDraft {
  title: string;
  body: string;
  citations: CitationRef[];
}

const AI_PHRASES = [
  "بصفتي نموذج",
  "كذكاء اصطناعي",
  "لا أستطيع",
  "إليك",
  "بالتأكيد",
  "لا يقوم دفع شكلي على نص محفوظ مطابق",
  "والدفع الموضوعي يدخل في هذا النص",
  "وهذا البند لا يسلم",
  "والجواب عن هذا البند فيما سيأتي",
  "هذا النص يحكم الواقعة",
  "ولا يُقر هذا الجواب البند على إطلاقه",
  "يقتصر المقام على الدفع الموضوعي",
];

export type ArticleIssue = "termination-compensation" | "end-of-service-wage";

export interface ArticleMatch {
  article: RetrievedArticle;
  issue: ArticleIssue;
  reason: string;
}

const MONTH_NUMBER: Record<string, string> = {
  يناير: "01",
  فبراير: "02",
  مارس: "03",
  أبريل: "04",
  مايو: "05",
  يونيو: "06",
  يوليو: "07",
  أغسطس: "08",
  سبتمبر: "09",
  أكتوبر: "10",
  نوفمبر: "11",
  ديسمبر: "12",
};

function governs(issue: ArticleIssue, text: string): boolean {
  if (issue === "termination-compensation") return text.includes("سبب غير مشروع") && text.includes("تعويض") && text.includes("إنهاء");
  return text.includes("انتهت خدمة") && text.includes("دفع أجره");
}

function issuesIn(facts: string, requests: string): ArticleIssue[] {
  const blob = `${facts}\n${requests}`;
  const issues: ArticleIssue[] = [];
  if (/سبب غير مشروع|دون إنذار|انتهت العلاقة|إنهاء العقد|أنهى صاحب العمل/.test(blob)) issues.push("termination-compensation");
  if (/أجر/.test(blob) && /لم يُ?صرف|لم يسدد|لم يُ?دفع|غير المصروف/.test(blob)) issues.push("end-of-service-wage");
  return issues;
}

export function matchArticles(articles: RetrievedArticle[], facts: string, requests: string): ArticleMatch[] {
  const matches: ArticleMatch[] = [];
  for (const issue of issuesIn(facts, requests)) {
    const article = articles.find((item) => governs(issue, item.textAr));
    if (!article) continue;
    const mention = articleMention(article);
    const reason = issue === "termination-compensation"
      ? `لأن إنهاء العقد لسبب غير مشروع يرتب للطرف المتضرر التعويض الذي قررته ${mention}.`
      : `لأن انتهاء الخدمة مع بقاء الأجر دون صرف يوجب دفعه خلال أسبوع من انتهاء العلاقة، وهو ما قررته ${mention}.`;
    matches.push({ article, issue, reason });
  }
  return matches;
}

export function judgmentDateIn(facts: string): string {
  return facts.match(/بتاريخ\s*(\d{4}-\d{2}-\d{2})/)?.[1] || "";
}

function isoDatesIn(facts: string): string[] {
  const found = new Set<string>();
  for (const match of facts.matchAll(/\d{4}-\d{2}-\d{2}/g)) found.add(match[0]);
  for (const [name, month] of Object.entries(MONTH_NUMBER)) {
    const pattern = new RegExp(`${name}\\s+(\\d{4})`, "g");
    for (const match of facts.matchAll(pattern)) found.add(`${match[1]}-${month}-01`);
  }
  return [...found];
}

export function judgmentPrecedesFacts(facts: string, judgmentDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(judgmentDate)) return false;
  return isoDatesIn(facts).some((date) => date !== judgmentDate && date > judgmentDate);
}

function seedOf(text: string): number {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function pick(seed: string, options: string[]): string {
  return options[seedOf(seed) % options.length];
}

function westernDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function articleMention(article: RetrievedArticle): string {
  const lawName = article.lawNameAr.trim();
  return `المادة (${citationLabel(article.number)}) من ${lawName}`;
}

function allSources(packet: DraftPacket): { kind: CitationRef["kind"]; id: string; number?: string; text: string; mention?: string; statute: string }[] {
  const procedural = packet.procedural || [];
  const judgments = packet.judgments || [];
  return [
    ...packet.articles.map((article) => ({ kind: "article" as const, id: article.id, number: article.number, text: article.textAr, mention: articleMention(article), statute: article.lawNameAr })),
    ...procedural.map((article) => ({ kind: "article" as const, id: article.id, number: article.number, text: article.textAr, mention: articleMention(article), statute: article.lawNameAr })),
    ...packet.sharia.map((row) => ({ kind: "sharia" as const, id: row.id, number: row.reference, text: row.textAr, mention: row.reference, statute: "" })),
    ...judgments.map((row) => ({ kind: "judgment" as const, id: row.id, number: row.judgmentNo, text: row.fullText, mention: row.judgmentNo, statute: row.court })),
  ];
}

export function visibleMemo(text: string): string {
  const withoutTokens = text.replace(/\{\{cite:[^}]+\}\}/g, "");
  const lines = withoutTokens.split("\n").flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed) return [line];
    if (/^المصدر\s*[:：]/.test(trimmed)) return [];
    if (/^(?:الإصدار|النسخة)\b/.test(trimmed)) return [];
    const stripped = line.replace(/https?:\/\/\S+/g, "").replace(/[ \t]{2,}/g, " ");
    return stripped.trim() ? [stripped] : [];
  });
  let body = lines.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const basmala = "بسم الله الرحمن الرحيم";
  const count = body.split(basmala).length - 1;
  if (count > 1) {
    body = body.replaceAll(basmala, "").trim();
    body = `${basmala}\n\n${body}`;
  }
  return body;
}

export function findAiTell(text: string): string | null {
  for (const phrase of AI_PHRASES) {
    if (text.includes(phrase)) return phrase;
  }
  if (/\*\*|__|^#{1,6}\s|```/m.test(text)) return "markdown";
  if (/\p{Extended_Pictographic}/u.test(text)) return "emoji";
  const english = text.match(/\b[A-Za-z]{3,}\b/);
  if (english) return english[0];
  return null;
}

function quotedSpans(text: string): { start: number; end: number; inner: string }[] {
  const spans = [];
  const pattern = /«([^»]*)»|"([^"]{8,})"|“([^”]{8,})”/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const inner = match[1] ?? match[2] ?? match[3] ?? "";
    spans.push({ start: match.index, end: match.index + match[0].length, inner });
  }
  return spans;
}

function exactQuote(inner: string, packet: DraftPacket): boolean {
  const hashed = textHash(inner);
  const articles = [...packet.articles, ...(packet.procedural || [])];
  if (articles.some((article) => textHash(article.textAr) === hashed)) return true;
  if (packet.sharia.some((row) => textHash(row.textAr) === hashed)) return true;
  return (packet.judgments || []).some((row) => textHash(row.fullText) === hashed);
}

function sourceById(packet: DraftPacket, id: string) {
  return allSources(packet).find((row) => row.id === id);
}

export interface DraftCheckRecord {
  recordId: string;
  articleNumber: string;
  statute: string;
  failureType: string;
  quoteSpan: string;
}

export function draftCheckRecord(input: {
  recordId?: string;
  articleNumber?: string;
  statute?: string;
  failureType: string;
  quoteSpan: string;
  facts?: string;
  memo?: string;
}): DraftCheckRecord {
  return {
    recordId: String(input.recordId || "").slice(0, 80),
    articleNumber: String(input.articleNumber || "").slice(0, 40),
    statute: String(input.statute || "").slice(0, 160),
    failureType: String(input.failureType || "").slice(0, 40),
    quoteSpan: String(input.quoteSpan || "").replace(/\s+/g, " ").trim().slice(0, 400),
  };
}

export function injectRefs(text: string, packet: DraftPacket): string {
  return text.replace(/\[\[ref:\s*([^\]]+?)\s*\]\]/g, (_match, id: string) => {
    const source = sourceById(packet, id);
    if (!source || !source.text) return "";
    return `${source.mention || source.id}: «${source.text}»`;
  });
}

function nearestSource(text: string, at: number, packet: DraftPacket) {
  const before = text.slice(Math.max(0, at - 220), at);
  let hit: ReturnType<typeof allSources>[number] | undefined;
  let nearest = -1;
  for (const row of allSources(packet)) {
    if (!row.mention) continue;
    const found = before.lastIndexOf(row.mention);
    if (found > nearest) {
      nearest = found;
      hit = row;
    }
    const label = row.kind === "article" ? citationLabel(row.number || "") : "";
    if (label) {
      const bare = before.lastIndexOf(`المادة (${label})`);
      if (bare > nearest) {
        nearest = bare;
        hit = row;
      }
    }
  }
  return nearest >= 0 ? hit : undefined;
}

export function repairQuotes(text: string, packet: DraftPacket): { text: string; ok: boolean; reason?: string; failures: DraftCheckRecord[] } {
  const failures: DraftCheckRecord[] = [];
  let next = injectRefs(text, packet);
  const spans = quotedSpans(next);
  for (const span of [...spans].reverse()) {
    if (exactQuote(span.inner, packet)) continue;
    const hit = nearestSource(next, span.start, packet);
    if (!hit || !hit.text) return { text, ok: false, reason: "quote", failures: [...failures, draftCheckRecord({ failureType: "quote", quoteSpan: span.inner })] };
    failures.push(draftCheckRecord({ recordId: hit.id, articleNumber: hit.number || "", statute: hit.statute, failureType: "quote", quoteSpan: span.inner }));
    next = `${next.slice(0, span.start)}«${hit.text}»${next.slice(span.end)}`;
  }
  const tail = /((?:نصت\s+)?المادة\s*\(((?:[^()]|\([^()]*\))*)\)(?:\s*من\s+[^\n:«"]{0,120})?\s*[:：]\s*)([^\s«"\n][^\n«"]*)/g;
  const tails = [];
  let found: RegExpExecArray | null;
  while ((found = tail.exec(next))) {
    tails.push({ start: found.index + found[1].length, end: found.index + found[0].length, inner: found[3], label: normalizeCitationText(found[2] || "") });
  }
  for (const span of tails.reverse()) {
    if (exactQuote(span.inner, packet)) continue;
    const known = articleLabels(packet);
    const article = known.get(span.label);
    if (!article) return { text, ok: false, reason: span.label ? `article:${span.label}` : "quote", failures: [...failures, draftCheckRecord({ failureType: "article", articleNumber: span.label, quoteSpan: span.inner })] };
    failures.push(draftCheckRecord({ recordId: article.id, articleNumber: article.number, statute: article.lawNameAr, failureType: "paraphrase", quoteSpan: span.inner }));
    next = `${next.slice(0, span.start)}«${article.textAr}»${next.slice(span.end)}`;
  }
  const told = /نصت\s+المادة\s*\(((?:[^()]|\([^()]*\))*)\)[^\n]{0,80}?على\s+أن\s+([^\n]+)/g;
  const toldSpans = [];
  while ((found = told.exec(next))) {
    toldSpans.push({ start: found.index + found[0].length - found[2].length, end: found.index + found[0].length, inner: found[2], label: normalizeCitationText(found[1] || "") });
  }
  for (const span of toldSpans.reverse()) {
    if (exactQuote(span.inner, packet)) continue;
    const article = articleLabels(packet).get(span.label);
    if (!article) return { text, ok: false, reason: span.label ? `article:${span.label}` : "quote", failures: [...failures, draftCheckRecord({ failureType: "article", articleNumber: span.label, quoteSpan: span.inner })] };
    failures.push(draftCheckRecord({ recordId: article.id, articleNumber: article.number, statute: article.lawNameAr, failureType: "paraphrase", quoteSpan: span.inner }));
    next = `${next.slice(0, span.start)}«${article.textAr}»${next.slice(span.end)}`;
  }
  return { text: next, ok: true, failures };
}

function articleLabels(packet: DraftPacket): Map<string, RetrievedArticle> {
  const map = new Map<string, RetrievedArticle>();
  for (const article of [...packet.articles, ...(packet.procedural || [])]) {
    map.set(citationLabel(article.number), article);
  }
  return map;
}

export function findBadCitation(text: string, packet: DraftPacket): string | null {
  const known = articleLabels(packet);
  const named = /المادة\s*\(((?:[^()]|\([^()]*\))*)\)\s*من\s+([^\n:«»]+?)(?=\s*[:：]|\s+على\b|\s*$)/g;
  let match: RegExpExecArray | null;
  while ((match = named.exec(text))) {
    const label = normalizeCitationText(match[1] || "");
    const lawName = normalizeCitationText(match[2] || "");
    const article = known.get(label);
    if (!article) return `article:${label}`;
    if (lawName && normalizeCitationText(article.lawNameAr) !== lawName) return `statute:${label}`;
  }
  const bare = /المادة\s*\(((?:[^()]|\([^()]*\))*)\)/g;
  while ((match = bare.exec(text))) {
    const label = normalizeCitationText(match[1] || "");
    if (!known.has(label)) return `article:${label}`;
  }
  return null;
}

export function findBadSharia(text: string, packet: DraftPacket): string | null {
  for (const row of packet.sharia) {
    if (!text.includes(row.reference)) continue;
    const prefix = row.textAr.slice(0, Math.min(24, row.textAr.length));
    if (prefix && !text.includes(prefix)) return `sharia:${row.reference}`;
  }
  return null;
}

export function findInventedNumber(text: string, packet: DraftPacket): string | null {
  const allowed = new Set<string>();
  const remember = (value: string) => {
    for (const match of westernDigits(value).matchAll(/\d[\d.,]*/g)) {
      const token = match[0].replace(/[.,]/g, "");
      if (token) allowed.add(token);
    }
  };
  remember(packet.slots.facts);
  remember(packet.slots.requests);
  remember(packet.slots.plaintiff);
  remember(packet.slots.defendant);
  for (const source of allSources(packet)) {
    remember(source.text);
    if (source.mention) remember(source.mention);
  }
  for (const article of [...packet.articles, ...(packet.procedural || [])]) remember(citationLabel(article.number));
  let prose = text;
  for (const source of allSources(packet)) {
    if (source.text) prose = prose.split(source.text).join(" ");
  }
  for (const match of westernDigits(prose).matchAll(/\d[\d.,]*/g)) {
    const token = match[0].replace(/[.,]/g, "");
    if (token.length >= 2 && !allowed.has(token)) return token;
  }
  const names = text.match(/(?:شركة|مؤسسة)\s+[\u0600-\u06FF]{2,}|[\u0600-\u06FF]{2,}\s+بن\s+[\u0600-\u06FF]{2,}/g) || [];
  const corpus = normalizeCitationText(`${packet.slots.facts}\n${packet.slots.plaintiff}\n${packet.slots.defendant}\n${packet.slots.requests}\n${allSources(packet).map((row) => `${row.text}\n${row.mention || ""}`).join("\n")}`);
  for (const name of names) {
    if (!corpus.includes(normalizeCitationText(name))) return name;
  }
  return null;
}

function stripVersions(text: string, packet: DraftPacket): string {
  const versions = [...packet.articles, ...(packet.procedural || [])]
    .map((article) => article.version.trim())
    .filter((version) => version.length >= 3 && !/[A-Za-z]/.test(version));
  if (!versions.length) return text;
  return text
    .split(/(«[^»]*»)/g)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      let next = part;
      for (const version of versions) next = next.split(version).join("");
      return next;
    })
    .join("");
}

export function reviewModelDraft(raw: string, packet: DraftPacket): { ok: true; draft: SettledDraft; failures: DraftCheckRecord[] } | { ok: false; reason: string; failures: DraftCheckRecord[] } {
  const cleaned = injectRefs(visibleMemo(raw), packet);
  const tell = findAiTell(cleaned);
  if (tell) return { ok: false, reason: `tell:${tell}`, failures: [draftCheckRecord({ failureType: "tell", quoteSpan: tell })] };
  const citation = findBadCitation(cleaned, packet);
  if (citation) return { ok: false, reason: citation, failures: [draftCheckRecord({ failureType: "article", articleNumber: citation.replace(/^article:|^statute:/, ""), quoteSpan: citation })] };
  const repaired = repairQuotes(cleaned, packet);
  if (!repaired.ok) return { ok: false, reason: repaired.reason || "quote", failures: repaired.failures };
  const sharia = findBadSharia(repaired.text, packet);
  if (sharia) return { ok: false, reason: sharia, failures: [...repaired.failures, draftCheckRecord({ failureType: "sharia", quoteSpan: sharia })] };
  const withBasmala = repaired.text.includes("بسم الله الرحمن الرحيم") ? repaired.text : `بسم الله الرحمن الرحيم\n\n${repaired.text}`;
  const body = stripVersions(visibleMemo(withBasmala), packet);
  if (body.split("بسم الله الرحمن الرحيم").length - 1 !== 1) return { ok: false, reason: "basmala", failures: repaired.failures };
  const invented = findInventedNumber(body, packet);
  if (invented) return { ok: false, reason: `invented:${invented}`, failures: [...repaired.failures, draftCheckRecord({ failureType: "invented", quoteSpan: invented })] };
  const judgedOn = packet.memoType === "appeal" ? judgmentDateIn(packet.slots.facts) : "";
  if (judgedOn && judgmentPrecedesFacts(packet.slots.facts, judgedOn)) {
    return { ok: false, reason: "judgment-date", failures: [...repaired.failures, draftCheckRecord({ failureType: "judgment-date", quoteSpan: judgedOn })] };
  }
  if (findAiTell(body)) return { ok: false, reason: "tell", failures: repaired.failures };
  const ordered = applySectionNumbers(body);
  if (packet.memoType === "defense") {
    const plea = ordered.split("الطلبات").pop() || "";
    if (asksToChargeDefendant(plea)) return { ok: false, reason: "request", failures: [...repaired.failures, draftCheckRecord({ failureType: "request", quoteSpan: "إلزام المدّعى عليه" })] };
  }
  return { ok: true, draft: finishDraft(packet, ordered, citationsUsed(ordered, packet)), failures: repaired.failures };
}

function citationsUsed(body: string, packet: DraftPacket): CitationRef[] {
  const refs: CitationRef[] = [];
  for (const article of [...packet.articles, ...(packet.procedural || [])]) {
    if (body.includes(articleMention(article)) || body.includes(article.textAr)) {
      refs.push({ kind: "article", id: article.id, number: article.number });
    }
  }
  for (const row of packet.sharia) {
    if (body.includes(row.reference) || body.includes(row.textAr)) refs.push({ kind: "sharia", id: row.id });
  }
  for (const row of packet.judgments || []) {
    if (body.includes(row.judgmentNo) || body.includes(row.fullText)) refs.push({ kind: "judgment", id: row.id, number: row.judgmentNo });
  }
  return refs;
}

const ORDINALS = ["أولًا", "ثانيًا", "ثالثًا", "رابعًا", "خامسًا", "سادسًا", "سابعًا", "ثامنًا"];
const APPEAL_HEADING = "فضيلة رئيس محكمة الاستئناف";

const SECTION_TITLES = ["الدفوع الشكلية", "الدفوع الموضوعية", "الرد على مذكرة الخصم", "الحكم المعترض عليه", "أوجه الاعتراض", "الأسانيد النظامية", "الأسانيد الإجرائية", "الأسانيد الشرعية", "الأسانيد", "الوقائع", "الطلبات"];

export function renumberSections(text: string): string {
  return applySectionNumbers(text);
}

export function applySectionNumbers(text: string): string {
  const ordinalWord = "أولًا|اولا|ثانيًا|ثانيا|ثالثًا|ثالثا|رابعًا|رابعا|خامسًا|خامسا|سادسًا|سادسا|سابعًا|سابعا|ثامنًا|ثامنا";
  const stripped = text.replace(new RegExp(`(^|\\n)[ \\t]*(?:${ordinalWord})[ \\t]*[:：][ \\t]*`, "g"), "$1");
  let index = 0;
  return stripped.replace(new RegExp(`(^|\\n)[ \\t]*(${SECTION_TITLES.join("|")})(?=[ \\t]*$)`, "gm"), (_match, lead: string, title: string) => {
    const ordinal = ORDINALS[Math.min(index, ORDINALS.length - 1)];
    index += 1;
    return `${lead}${ordinal}: ${title}`;
  });
}

function numbered(sections: { title: string; lines: string[] }[]): string[] {
  const present = sections
    .map((section) => ({ title: section.title, lines: section.lines.map((line) => line.trim()).filter(Boolean) }))
    .filter((section) => section.lines.length > 0);
  const out: string[] = [];
  present.forEach((section, index) => {
    out.push("", `${ORDINALS[Math.min(index, ORDINALS.length - 1)]}: ${section.title}`, ...section.lines);
  });
  return out;
}

function asksToChargeDefendant(text: string): boolean {
  return text.includes("إلزام المدّعى عليه") || text.includes("إلزام المدعى عليه");
}

function filerName(packet: DraftPacket): string {
  const defendantFiles = packet.memoType === "defense" || (packet.memoType === "reply" && !packet.slots.plaintiff.trim());
  const raw = defendantFiles ? packet.slots.defendant : packet.slots.plaintiff;
  const name = raw.trim();
  if (!name || name === "المذكور في الوقائع") return "";
  return name;
}

function filerHeading(packet: DraftPacket): string {
  if (packet.memoType === "appeal") return "مقدم اللائحة";
  if (packet.memoType === "lawsuit") return "مقدم الصحيفة";
  return "مقدم المذكرة";
}

function filerCapacity(packet: DraftPacket): string {
  if (packet.memoType === "defense") return "المدّعى عليه";
  if (packet.memoType === "appeal") return "المعترض";
  if (packet.memoType === "reply" && !packet.slots.plaintiff.trim() && packet.slots.defendant.trim()) return "المدّعى عليه";
  return "المدّعي";
}

function labeled(label: string, value: string): string {
  return value ? `${label}: ${value}` : `${label}:`;
}

export function closingBlock(packet: DraftPacket): string {
  const name = filerName(packet);
  return ["والله يحفظكم ويرعاكم،،", "", labeled(filerHeading(packet), name), labeled(filerCapacity(packet), name), "التاريخ:", "التوقيع:"].join("\n");
}

function ensureSignature(packet: DraftPacket, body: string): string {
  const block = closingBlock(packet);
  let trimmed = body.trimEnd();
  const courtesy = "والله يحفظكم ويرعاكم";
  const at = trimmed.lastIndexOf(courtesy);
  if (at >= 0) trimmed = trimmed.slice(0, at).trimEnd();
  trimmed = trimmed.replace(/\n*والله الموفق[،.\s]*$/u, "").trimEnd();
  return `${trimmed}\n\n${block}`;
}

function finishDraft(packet: DraftPacket, body: string, citations: CitationRef[]): SettledDraft {
  const title = packet.title || "";
  const heading = packet.courtHeading || "";
  let text = body;
  if (packet.letterhead && !text.includes(packet.letterhead)) text = text.replace("بسم الله الرحمن الرحيم", `بسم الله الرحمن الرحيم\n\n${packet.letterhead}`);
  if (title && !text.includes(title)) text = text.replace("بسم الله الرحمن الرحيم", `بسم الله الرحمن الرحيم\n\n${title}`);
  if (heading && title && !text.includes(heading)) text = text.replace(title, `${title}\n\n${heading}`);
  return { title, body: ensureSignature(packet, text.trim()), citations };
}

function quoteBlock(article: RetrievedArticle, seed: string, reason: string): string {
  const link = pick(`${seed}:${article.id}`, ["وحيث إن", "وبما أن", "ولما كانت"]);
  return `${link} ${articleMention(article)}: «${article.textAr}»، ${reason}`;
}

function fitted(packet: DraftPacket): ArticleMatch[] {
  return matchArticles(packet.articles, packet.slots.facts, packet.slots.requests);
}

function statutoryLines(packet: DraftPacket, seed: string, matches: ArticleMatch[]): string[] {
  const lines: string[] = [];
  if (packet.notice) lines.push(packet.notice);
  const cited = new Set<string>();
  for (const match of matches) {
    lines.push(quoteBlock(match.article, seed, match.reason));
    cited.add(match.article.id);
  }
  const known = (["termination-compensation", "end-of-service-wage"] as ArticleIssue[]);
  for (const article of packet.articles) {
    if (cited.has(article.id)) continue;
    if (known.some((issue) => governs(issue, article.textAr))) continue;
    lines.push(quoteBlock(article, seed, `لأن الطلب يستند إلى ${articleMention(article)} دون زيادة على نصه المحفوظ.`));
  }
  if (!lines.length && !(packet.procedural || []).length) {
    lines.push(pick(`${seed}:empty`, [
      "تقتصر الأسانيد على ما ذكره الموكل، دون إيراد رقم مادة، لأن المدونة المحفوظة لم تعرض نصًا مطابقًا.",
      "لا يورد هذا المقام رقم مادة، إذ لم يُحفظ نص نظامي يطابق ما سلف.",
    ]));
  }
  return lines;
}

function shariaLines(packet: DraftPacket, seed: string): string[] {
  return packet.sharia.map((row) => {
    const lead = pick(`${seed}:${row.id}`, ["ويستأنس بما ورد في", "ويؤيد ذلك ما جاء في", "ومن ذلك ما ورد في"]);
    return `${lead} ${row.reference}: «${row.textAr}».`;
  });
}

function judgmentLines(packet: DraftPacket, seed: string): string[] {
  return (packet.judgments || []).map((row) => {
    const lead = pick(`${seed}:${row.id}`, ["ومن السوابق، الحكم رقم", "ويُستأنس بالحكم رقم", "وقد سبق أن صدر الحكم رقم"]);
    return `${lead} ${row.judgmentNo} الصادر من ${row.court} في ${row.city}: «${row.fullText}».`;
  });
}

function replyAnswer(point: string, matches: ArticleMatch[]): string {
  const wage = matches.find((match) => match.issue === "end-of-service-wage");
  const termination = matches.find((match) => match.issue === "termination-compensation");
  if (wage && /أجر|يُصرف|يصرف/.test(point)) {
    return `الجواب: بقاء الأجر دون صرف بعد انتهاء الخدمة يوجب أداءه خلال أسبوع من انتهاء العلاقة، وفق ${articleMention(wage.article)}.`;
  }
  if (termination && /انتهت|إنهاء|إنذار|مشروع/.test(point)) {
    return `الجواب: إنهاء العقد لسبب غير مشروع يرتب التعويض للطرف المتضرر، وفق ${articleMention(termination.article)}.`;
  }
  return "الجواب: يُجاب هذا البند بما تثبته الوقائع والسند المحفوظ دون إضافة واقعة.";
}

function replyPoints(facts: string, matches: ArticleMatch[]): string[] {
  const parts = facts.split(/(?<=[.؟!])\s+/).map((part) => part.trim()).filter(Boolean);
  const points = parts.length > 1 ? parts : [facts];
  return points.flatMap((point, index) => [`البند ${index + 1}: ${point}`, replyAnswer(point, matches)]);
}

function appealedJudgment(facts: string): string {
  const number = facts.match(/رقم\s*([0-9٠-٩]{2,})/)?.[1] || "";
  const date = (facts.match(/بتاريخ\s*([0-9٠-٩][0-9٠-٩/.\-]{3,})/)?.[1] || "").replace(/\.+$/, "");
  if (number && date) return `الحكم رقم ${number} الصادر بتاريخ ${date}.`;
  if (number) return `الحكم رقم ${number} كما ذكره المعترض.`;
  if (date) return `الحكم الصادر بتاريخ ${date} كما ذكره المعترض.`;
  return "الحكم محل الاعتراض هو ما ذكره المعترض في أسباب طعنه.";
}

function parties(packet: DraftPacket): string[] {
  if (packet.memoType === "appeal") return [`المعترض: ${packet.slots.plaintiff}`, `المعترض ضده: ${packet.slots.defendant}`];
  if (packet.memoType === "defense") return [`المدّعى عليه: ${packet.slots.defendant}`, `المدّعي: ${packet.slots.plaintiff}`];
  if (packet.memoType === "reply") return [`مقدم الجواب: ${packet.slots.plaintiff}`, `الخصم: ${packet.slots.defendant}`];
  return [`المدّعي: ${packet.slots.plaintiff}`, `المدّعى عليه: ${packet.slots.defendant}`];
}

function defenseMerits(matches: ArticleMatch[]): string[] {
  const lines: string[] = [];
  if (matches.some((match) => match.issue === "termination-compensation")) {
    lines.push("يدفع المدّعى عليه بأن التعويض عن الإنهاء لا يستحق إلا إذا أثبت المدّعي أن الإنهاء كان لسبب غير مشروع.");
  }
  if (matches.some((match) => match.issue === "end-of-service-wage")) {
    lines.push("وبشأن الأجر، يدفع المدّعى عليه بأن وجوب الدفع معلق على انتهاء الخدمة وثبوت بقاء الأجر دون صرف، ويطلب رد ما لم يقم عليه دليل.");
  }
  if (!lines.length) lines.push("يدفع المدّعى عليه الدعوى ويطلب ردها، دون إضافة واقعة لم يذكرها الخصم.");
  return lines;
}

function lawsuitRequests(packet: DraftPacket, matches: ArticleMatch[]): string[] {
  const lines: string[] = [];
  if (matches.some((match) => match.issue === "termination-compensation")) {
    lines.push("إلزام المدّعى عليه بالتعويض المقرر عن إنهاء العقد لسبب غير مشروع.");
  }
  if (matches.some((match) => match.issue === "end-of-service-wage")) {
    lines.push(packet.slots.requests.trim() || "إلزام المدّعى عليه بدفع الأجر غير المصروف بعد انتهاء الخدمة.");
  }
  if (!lines.length && packet.slots.requests.trim()) lines.push(packet.slots.requests.trim());
  return lines;
}

function sectionsOf(packet: DraftPacket, seed: string): { title: string; lines: string[] }[] {
  const procedural = packet.procedural || [];
  const matches = fitted(packet);
  const grounds = statutoryLines(packet, seed, matches);
  const sharia = shariaLines(packet, seed);
  const precedents = judgmentLines(packet, seed);
  const proceduralLines = procedural.map((article) => quoteBlock(article, `${seed}:p`, "لأن هذا النص الإجرائي هو سند الدفع الشكلي."));
  if (packet.memoType === "defense") {
    const plea = asksToChargeDefendant(packet.slots.requests)
      ? pick(`${seed}:plea`, ["رد الدعوى.", "رفض الدعوى.", "عدم قبول الدعوى."])
      : packet.slots.requests;
    return [
      { title: "الدفوع الشكلية", lines: proceduralLines },
      {
        title: "الدفوع الموضوعية",
        lines: [...defenseMerits(matches), ...grounds, ...sharia, ...precedents],
      },
      {
        title: "الطلبات",
        lines: [plea, pick(`${seed}:close`, [
          "وبناءً على ما تقدم، نلتمس من فضيلتكم رد الدعوى.",
          "لذا نلتمس من فضيلتكم الحكم برفض الدعوى.",
          "وعليه نطلب من فضيلتكم عدم قبول الدعوى.",
        ])],
      },
    ];
  }
  if (packet.memoType === "reply") {
    return [
      { title: "الرد على مذكرة الخصم", lines: replyPoints(packet.slots.facts, matches) },
      { title: "الأسانيد", lines: [...grounds, ...proceduralLines, ...sharia, ...precedents] },
      {
        title: "الطلبات",
        lines: [packet.slots.requests, pick(`${seed}:close`, [
          "وبناءً على ما تقدم، نلتمس من فضيلتكم رد ما جاء في مذكرة الخصم.",
          "لذا نلتمس من فضيلتكم عدم الالتفات إلى مذكرة الخصم.",
          "وعليه نطلب من فضيلتكم الأخذ بهذا الجواب.",
        ])],
      },
    ];
  }
  if (packet.memoType === "appeal") {
    const judgedOn = judgmentDateIn(packet.slots.facts);
    const judgmentLine = judgedOn && judgmentPrecedesFacts(packet.slots.facts, judgedOn)
      ? "تاريخ الحكم سابق على تاريخ الوقائع، فلا يُنسب إلى الحكم أنه فصل فيها."
      : appealedJudgment(packet.slots.facts);
    return [
      { title: "الحكم المعترض عليه", lines: [judgmentLine] },
      {
        title: "أوجه الاعتراض",
        lines: [`${pick(seed, ["أسباب الاعتراض تتلخص في أن", "ينعى المعترض على الحكم أن", "حاصل الاعتراض أن"])} ${packet.slots.facts}`],
      },
      { title: "الأسانيد", lines: [...grounds, ...proceduralLines, ...sharia, ...precedents] },
      {
        title: "الطلبات",
        lines: [pick(`${seed}:close`, [
          "وبناءً على ما تقدم، نلتمس من فضيلتكم نقض الحكم.",
          "لذا نلتمس من فضيلتكم نقض الحكم المطعون فيه.",
          "وعليه نطلب من فضيلتكم نقض الحكم.",
        ])],
      },
    ];
  }
  return [
    {
      title: "الوقائع",
      lines: [`${pick(seed, ["تتلخص وقائع الدعوى في أن", "يقول المدّعي في بيان دعواه إن", "حاصل شكوى المدّعي أن"])} ${packet.slots.facts}`],
    },
    { title: "الأسانيد النظامية", lines: grounds },
    { title: "الأسانيد الإجرائية", lines: proceduralLines },
    { title: "الأسانيد الشرعية", lines: [...sharia, ...precedents] },
    {
      title: "الطلبات",
      lines: [...lawsuitRequests(packet, matches), pick(`${seed}:close`, [
        "وبناءً على ما تقدم، نلتمس من فضيلتكم الحكم بالطلبات.",
        "لذا نلتمس من فضيلتكم نظر الطلبات والقضاء بها.",
        "وعليه نطلب من فضيلتكم الحكم بما ورد في الطلبات.",
      ])],
    },
  ];
}

export function humanMemo(packet: DraftPacket): SettledDraft {
  const title = packet.title || "";
  const heading = packet.memoType === "appeal" ? APPEAL_HEADING : packet.courtHeading || "";
  const seed = `${packet.memoType}:${packet.slots.facts}`;
  const lines = ["بسم الله الرحمن الرحيم", "", title, "", heading];
  if (packet.letterhead) lines.push(packet.letterhead);
  lines.push("", ...parties(packet), ...numbered(sectionsOf(packet, seed)));
  const body = ensureSignature(packet, applySectionNumbers(lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n")));
  return { title, body, citations: citationsUsed(body, packet) };
}

export function draftPrompt(packet: DraftPacket): string {
  const sources = allSources(packet).map((row) => `[[ref:${row.id}]] ${row.mention || row.id}`).join("\n");
  const shape: Record<MemoType, string> = {
    lawsuit: "صحيفة دعوى من المدّعي: الوقائع، ثم الأسانيد، ثم الطلبات.",
    defense: "مذكرة دفاع من المدّعى عليه: الدفوع الشكلية، ثم الدفوع الموضوعية، ثم طلب رد الدعوى. لا تطلب إلزام المدّعى عليه.",
    reply: "مذكرة جوابية ترد على مذكرة الخصم بندًا بندًا، ثم الأسانيد، ثم الطلبات.",
    appeal: "لائحة اعتراضية إلى محكمة الاستئناف: رقم الحكم وتاريخه إن وردا في الوقائع، ثم أوجه الاعتراض، ثم طلب نقض الحكم.",
  };
  return [
    `اكتب ${packet.title || "المذكرة"} بعبارة محامٍ سعودي أمام ${packet.memoType === "appeal" ? APPEAL_HEADING : packet.courtHeading || "المحكمة"}.`,
    shape[packet.memoType],
    "لا تكتب نص مادة أو آية أو حكم. أشر إلى النص المحفوظ بهذا الشكل فقط: [[ref:المعرف]].",
    "لا ترقّم الأقسام. اكتب عنوان القسم وحده، مثل الوقائع أو الطلبات.",
    "أعد صياغة الوقائع في سرد متصل، وأبق كل واقعة مذكورة، ولا تضف واقعة أو تاريخًا أو مبلغًا أو اسمًا.",
    "لا تذكر رابطًا ولا رقم إصدار، ولا تكتب بالإنجليزية، ولا تستخدم نجوم التنسيق.",
    "ابدأ مرة واحدة ببسم الله الرحمن الرحيم، وخاطب المحكمة بـ حيث إن وبما أن وبناءً على ما تقدم ونلتمس من فضيلتكم.",
    `المدّعي: ${packet.slots.plaintiff}`,
    `المدّعى عليه: ${packet.slots.defendant}`,
    `الوقائع: ${packet.slots.facts}`,
    `الطلبات: ${packet.slots.requests}`,
    sources || "لا مرجع محفوظ. لا تذكر رقم مادة.",
  ].join("\n");
}

export function textMatchesOfficial(quote: string, official: string): boolean {
  return textHash(quote) === textHash(official);
}
