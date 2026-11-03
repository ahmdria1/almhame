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

const AI_PHRASES = ["بصفتي نموذج", "كذكاء اصطناعي", "لا أستطيع", "إليك", "بالتأكيد"];

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

function allSources(packet: DraftPacket): { kind: CitationRef["kind"]; id: string; number?: string; text: string; mention?: string }[] {
  const procedural = packet.procedural || [];
  const judgments = packet.judgments || [];
  return [
    ...packet.articles.map((article) => ({ kind: "article" as const, id: article.id, number: article.number, text: article.textAr, mention: articleMention(article) })),
    ...procedural.map((article) => ({ kind: "article" as const, id: article.id, number: article.number, text: article.textAr, mention: articleMention(article) })),
    ...packet.sharia.map((row) => ({ kind: "sharia" as const, id: row.id, number: row.reference, text: row.textAr, mention: row.reference })),
    ...judgments.map((row) => ({ kind: "judgment" as const, id: row.id, number: row.judgmentNo, text: row.fullText, mention: row.judgmentNo })),
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
  const pattern = /«([^»]+)»/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    spans.push({ start: match.index, end: match.index + match[0].length, inner: match[1] });
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

export function repairQuotes(text: string, packet: DraftPacket): { text: string; ok: boolean; reason?: string } {
  let next = text;
  const spans = quotedSpans(text);
  for (const span of [...spans].reverse()) {
    if (exactQuote(span.inner, packet)) continue;
    const before = next.slice(Math.max(0, span.start - 180), span.start);
    let hit: ReturnType<typeof allSources>[number] | undefined;
    let nearest = -1;
    for (const row of allSources(packet)) {
      if (!row.mention) continue;
      const at = before.lastIndexOf(row.mention);
      if (at > nearest) {
        nearest = at;
        hit = row;
      }
    }
    if (!hit || nearest < 0) return { text, ok: false, reason: "quote" };
    const replacement = `«${hit.text}»`;
    next = `${next.slice(0, span.start)}${replacement}${next.slice(span.end)}`;
  }
  return { text: next, ok: true };
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
  const named = /المادة\s*\(((?:[^()]|\([^()]*\))*)\)\s*من\s+([^\n:«»]+)/g;
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

export function reviewModelDraft(raw: string, packet: DraftPacket): { ok: true; draft: SettledDraft } | { ok: false; reason: string } {
  const cleaned = visibleMemo(raw);
  const tell = findAiTell(cleaned);
  if (tell) return { ok: false, reason: `tell:${tell}` };
  const citation = findBadCitation(cleaned, packet);
  if (citation) return { ok: false, reason: citation };
  const repaired = repairQuotes(cleaned, packet);
  if (!repaired.ok) return { ok: false, reason: repaired.reason || "quote" };
  const sharia = findBadSharia(repaired.text, packet);
  if (sharia) return { ok: false, reason: sharia };
  const withBasmala = repaired.text.includes("بسم الله الرحمن الرحيم") ? repaired.text : `بسم الله الرحمن الرحيم\n\n${repaired.text}`;
  const body = stripVersions(visibleMemo(withBasmala), packet);
  if (body.split("بسم الله الرحمن الرحيم").length - 1 !== 1) return { ok: false, reason: "basmala" };
  const invented = findInventedNumber(body, packet);
  if (invented) return { ok: false, reason: `invented:${invented}` };
  if (findAiTell(body)) return { ok: false, reason: "tell" };
  return { ok: true, draft: finishDraft(packet, body, citationsUsed(body, packet)) };
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

function finishDraft(packet: DraftPacket, body: string, citations: CitationRef[]): SettledDraft {
  const title = packet.title || "";
  const heading = packet.courtHeading || "";
  let text = body;
  if (packet.letterhead && !text.includes(packet.letterhead)) text = text.replace("بسم الله الرحمن الرحيم", `بسم الله الرحمن الرحيم\n\n${packet.letterhead}`);
  if (title && !text.includes(title)) text = text.replace("بسم الله الرحمن الرحيم", `بسم الله الرحمن الرحيم\n\n${title}`);
  if (heading && title && !text.includes(heading)) text = text.replace(title, `${title}\n\n${heading}`);
  return { title, body: text.trim(), citations };
}

function quoteBlock(article: RetrievedArticle, seed: string): string {
  const link = pick(`${seed}:${article.id}`, ["وحيث إن", "وبما أن", "ولما كانت"]);
  const tail = pick(`${seed}:${article.id}:tail`, [
    "وما سلف من الوقائع يأخذ حكم هذا النص.",
    "والواقعة المعروضة تدخل في مقتضى هذا النص.",
    "وهذا النص هو سند ما ذكره الموكل في الوقائع.",
  ]);
  return `${link} ${articleMention(article)}: «${article.textAr}»، ${tail}`;
}

export function humanMemo(packet: DraftPacket): SettledDraft {
  const title = packet.title || "";
  const heading = packet.courtHeading || "";
  const seed = `${packet.memoType}:${packet.slots.facts}`;
  const openers: Record<MemoType, string[]> = {
    lawsuit: ["تتلخص وقائع الدعوى في أن", "يقول المدّعي في بيان دعواه إن", "حاصل شكوى المدّعي أن"],
    defense: ["يدفع المدّعى عليه هذه الدعوى بأن", "وحاصل دفاع المدّعى عليه أن", "يرد المدّعى عليه بما مؤداه أن"],
    reply: ["جوابًا على ما أثير، فإن", "تعقيبًا على مذكرة الخصم، فإن", "يرد صاحب الجواب بأن"],
    appeal: ["أسباب الاعتراض تتلخص في أن", "ينعى المعترض على الحكم أن", "حاصل الاعتراض أن"],
  };
  const closings = [
    "وبناءً على ما تقدم، نلتمس من فضيلتكم الحكم بالطلبات.",
    "لذا نلتمس من فضيلتكم نظر الطلبات والقضاء بها.",
    "وعليه نطلب من فضيلتكم الحكم بما ورد في الطلبات.",
  ];
  const lines = ["بسم الله الرحمن الرحيم", "", title, "", heading];
  if (packet.letterhead) lines.push(packet.letterhead);
  lines.push(
    "",
    `المدّعي: ${packet.slots.plaintiff}`,
    `المدّعى عليه: ${packet.slots.defendant}`,
    "",
    "أولًا: الوقائع",
    `${pick(seed, openers[packet.memoType])} ${packet.slots.facts}`,
    "",
    "ثانيًا: الأسانيد النظامية",
  );
  const procedural = packet.procedural || [];
  if (packet.notice) lines.push(packet.notice);
  else if (packet.articles.length === 0 && procedural.length === 0) {
    lines.push(pick(`${seed}:empty`, [
      "تقتصر هذه المذكرة على ما ذكره الموكل، دون إيراد رقم مادة، لأن المدونة المحفوظة لم تعرض نصًا مطابقًا.",
      "لا يورد هذا المقام رقم مادة، إذ لم يُحفظ نص نظامي يطابق الوقائع المعروضة.",
    ]));
  } else {
    for (const article of packet.articles) lines.push(quoteBlock(article, seed));
  }
  if (procedural.length) {
    lines.push("", "الأسانيد الإجرائية");
    for (const article of procedural) lines.push(quoteBlock(article, `${seed}:p`));
  }
  lines.push("", "ثالثًا: الأسانيد الشرعية");
  if (packet.sharia.length === 0) {
    lines.push(pick(`${seed}:sharia`, [
      "ولا يورد هذا المقام نصًا شرعيًا برقم، إذ لم يُحفظ نص مطابق لما سلف.",
      "ويكتفى بما تقدم من الوقائع دون إيراد آية أو حديث برقم.",
    ]));
  } else {
    for (const row of packet.sharia) {
      const lead = pick(`${seed}:${row.id}`, ["ويستأنس بما ورد في", "ويؤيد ذلك ما جاء في", "ومن ذلك ما ورد في"]);
      lines.push(`${lead} ${row.reference}: «${row.textAr}».`);
    }
  }
  for (const row of packet.judgments || []) {
    const lead = pick(`${seed}:${row.id}`, ["ومن السوابق، الحكم رقم", "ويُستأنس بالحكم رقم", "وقد سبق أن صدر الحكم رقم"]);
    lines.push("", `${lead} ${row.judgmentNo} الصادر من ${row.court} في ${row.city}: «${row.fullText}».`);
  }
  lines.push("", "رابعًا: الطلبات", packet.slots.requests, "", pick(`${seed}:close`, closings), "", "والله الموفق.");
  const body = lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
  return { title, body, citations: citationsUsed(body, packet) };
}

export function draftPrompt(packet: DraftPacket): string {
  const sources = allSources(packet).map((row) => `مرجع ${row.mention || row.id}\n${row.text}`).join("\n\n");
  return [
    `اكتب ${packet.title || "المذكرة"} بعبارة محامٍ سعودي أمام ${packet.courtHeading || "المحكمة"}.`,
    "أعد صياغة الوقائع في سرد متصل، وأبق كل واقعة مذكورة، ولا تضف واقعة أو تاريخًا أو مبلغًا أو اسمًا.",
    "اربط الوقائع بالنصوص المعطاة تسبيبًا، وضع النص النظامي أو الشرعي بين «» كما أُعطي حرفيًا.",
    "لا تذكر رابطًا ولا رقم إصدار، ولا تكتب بالإنجليزية، ولا تستخدم نجوم التنسيق.",
    "ابدأ مرة واحدة ببسم الله الرحمن الرحيم، وخاطب المحكمة بـ حيث إن وبما أن وبناءً على ما تقدم ونلتمس من فضيلتكم.",
    `المدّعي: ${packet.slots.plaintiff}`,
    `المدّعى عليه: ${packet.slots.defendant}`,
    `الوقائع: ${packet.slots.facts}`,
    `الطلبات: ${packet.slots.requests}`,
    sources || "لا نص محفوظ يطابق هذه الوقائع، فلا تذكر رقم مادة.",
  ].join("\n");
}

export function textMatchesOfficial(quote: string, official: string): boolean {
  return textHash(quote) === textHash(official);
}
