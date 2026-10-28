import { citationLabel, parseHeading } from "./article-numbers.mjs";
import { htmlToText } from "./fetch-official.mjs";

const BAD_DEFINITION = "صاحب العمل: كل شخص طبيعي يعمل لمصلحة صاحب عمل";

function extractBalanced(html, markerRe) {
  const items = [];
  for (const match of html.matchAll(markerRe)) {
    const start = match.index;
    let index = start + match[0].length;
    let depth = 1;
    while (index < html.length && depth > 0) {
      const nextOpen = html.indexOf("<div", index);
      const nextClose = html.indexOf("</div>", index);
      if (nextClose < 0) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        index = nextOpen + 4;
      } else {
        depth -= 1;
        index = nextClose + 6;
      }
    }
    items.push(html.slice(start, index));
  }
  return items;
}

function tidy(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function quotesOf(value) {
  return [...String(value || "").matchAll(/"([\s\S]*?)"/g)].map((match) => tidy(match[1]).replace(/[«»“”]/g, "").trim()).filter(Boolean);
}

function markerIndex(value) {
  return value.search(/لتكون بالنص الآت[يى]|ليكون بالنص الآت[يى]|وتكون بالنص الآت[يى]|لتصبح بالنص الآت[يى]|ليكون النص كالآتي|يكون النص كالآتي|إحلال النص الآتي محله|بالنص الآتي|بالنص التالي/);
}

function lastQuoteAfterMarker(value) {
  const index = markerIndex(value);
  if (index < 0) return "";
  const quotes = quotesOf(value.slice(index));
  return quotes.length ? quotes[quotes.length - 1] : "";
}

function stripOwnHeading(text, heading) {
  const lines = tidy(text).split("\n");
  if (!lines.length) return "";
  const first = parseHeading(lines[0]);
  const own = parseHeading(heading);
  if (first.ok && own.ok && first.label === own.label) return tidy(lines.slice(1).join("\n"));
  return tidy(text);
}

function cleanQuoted(value) {
  return tidy(String(value || "").split(/\s+-\s*(?:إضافة|تعديل|إحلال|حذف)\s/)[0])
    .replace(/"+\s*\.?\s*$/g, "")
    .replace(/[«»]/g, "")
    .trim();
}

function quotedReformulations(popup) {
  const start = popup.search(/على النحو الآتي/);
  const body = start < 0 ? popup : popup.slice(start);
  const parts = body.split(/"\s*المادة\s+/).slice(1);
  return parts.map((part) => {
    const cleaned = part.replace(/"\s*$/, "").trim();
    const colon = cleaned.search(/[:：]/);
    if (colon < 0) return null;
    const title = `المادة ${cleaned.slice(0, colon).replace(/\s+/g, " ").trim()}`;
    const text = cleanQuoted(cleaned.slice(colon + 1));
    if (!parseHeading(title).ok || !text) return null;
    return { title, text };
  }).filter(Boolean);
}

function replaceClause(text, number, replacement) {
  const token = String(number).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\n)(\\s*${token}\\s*[/\\-–—.]\\s*)[\\s\\S]*?(?=(?:\\n\\s*\\d+\\s*[/\\-–—.])|$)`);
  const next = tidy(replacement);
  if (!pattern.test(text)) return `${tidy(text)}\n${number} - ${next}`;
  return tidy(text.replace(pattern, `$1${number} - ${next}`));
}

function replacePreamble(text, replacement) {
  const match = text.match(/(^|\n)\s*1\s*[\-–—.]/);
  const next = tidy(replacement);
  if (!match) return `${next}\n${tidy(text)}`;
  return tidy(`${next}${text.slice(match.index)}`);
}

function insertLine(text, number, line) {
  const row = tidy(line);
  if (!row || text.includes(row)) return text;
  const token = String(number).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`((?:^|\\n)\\s*${token}\\s*[\\-–—.][\\s\\S]*?)(?=\\n\\s*\\d+\\s*[\\-–—.]|$)`);
  if (!pattern.test(text)) return `${tidy(text)}\n${row}`;
  return tidy(text.replace(pattern, `$1\n${row}`));
}

function applySubstitutions(text, popup) {
  const pattern = /إحلال\s+(?:كلمة|عبارة)\s+"([^"]+)"\s+محل\s+(?:كلمتي|كلمة|عبارة)\s+"([^"]+)"(?:\s*و\s*"([^"]+)")?/g;
  let next = text;
  for (const match of popup.matchAll(pattern)) {
    const replacement = match[1];
    const targets = [match[2], match[3]].filter(Boolean).sort((left, right) => right.length - left.length);
    for (const target of targets) next = next.split(target).join(replacement);
  }
  return next;
}

function applyInsertions(text, popup) {
  const pattern = /إضافة\s+عبارة\s+"([^"]+)"\s+بعد\s+كلمة\s+"([^"]+)"/g;
  let next = text;
  for (const match of popup.matchAll(pattern)) {
    const phrase = match[1];
    const word = match[2];
    if (next.includes(`${word} ${phrase}`)) continue;
    const before = popup.slice(0, match.index);
    const paragraph = before.match(/الفقرة\s*\(\s*(\d+)\s*\)/);
    const replacement = `${word} ${phrase}`;
    if (!paragraph) {
      next = next.replace(word, replacement);
      continue;
    }
    const token = paragraph[1];
    const clause = new RegExp(`((?:^|\\n)\\s*${token}\\s*[\\-–—.][\\s\\S]*?)(?=\\n\\s*\\d+\\s*[\\-–—.]|$)`);
    next = next.replace(clause, (chunk) => chunk.replace(word, replacement));
  }
  return next;
}

function appendQuotes(text, popup) {
  let next = tidy(text);
  for (const quote of quotesOf(popup)) {
    if (quote.length < 12 || next.includes(quote.slice(0, Math.min(40, quote.length)))) continue;
    next = `${next}\n${quote}`;
  }
  return tidy(next);
}

function unwrapAdded(visible) {
  if (!/أُضيفت هذه المادة|اُضيفت هذه المادة|أضيفت هذه المادة|إضافة مادة تحمل الرقم/.test(visible)) return tidy(visible);
  const quote = lastQuoteAfterMarker(visible);
  return quote ? tidy(quote) : tidy(visible);
}

function addedArticle(popup) {
  const named = popup.match(/(?:تحمل الرقم|ترتيبها)\s*\(\s*([^)]+?)\s*\)/);
  if (!named) return null;
  const heading = `( ${named[1].replace(/\s+/g, " ").trim()} )`;
  if (!parseHeading(heading).ok) return null;
  const quote = lastQuoteAfterMarker(popup);
  if (!quote) return null;
  return { number: heading, textAr: tidy(quote).replace(/"+\s*(\.)?\s*$/g, (_, dot) => (dot ? "." : "")), shell: false };
}

export function consolidateVisible(heading, visible, popups) {
  let text = unwrapAdded(visible);
  const added = [];
  let shell = false;
  for (const popup of popups) {
    const flat = popup.replace(/\s+/g, " ").trim();
    if (/تحمل الرقم|يكون ترتيبها/.test(flat)) {
      const extra = addedArticle(flat);
      if (extra) added.push(extra);
      continue;
    }
    if (/تم إلغاء الباب الرابع عشر/.test(flat)) {
      text = flat;
      shell = true;
      continue;
    }
    if (/^(?:[-–]\s*)?(?:أُلغيت هذه المادة|ألغيت هذه المادة|تم إلغاء هذه المادة|تم الغاء هذه المادة|حُذفت هذه المادة)/.test(flat)) {
      text = flat.replace(/^[-–]\s*/, "");
      shell = true;
      continue;
    }
    const reformulated = quotedReformulations(flat);
    if (reformulated.length) {
      const own = reformulated.find((item) => citationLabel(item.title) === citationLabel(heading));
      if (own) {
        text = own.text;
        shell = false;
      } else if (!/إضافة ماد/.test(flat)) {
        const cut = flat.indexOf('"');
        text = tidy(cut > 0 ? flat.slice(0, cut) : flat);
        shell = true;
      }
      if (/إضافة ماد/.test(flat)) {
        for (const item of reformulated) {
          if (!item.text || citationLabel(item.title) === citationLabel(heading)) continue;
          added.push({ number: item.title, textAr: item.text, shell: false });
        }
      }
      continue;
    }
    const head = markerIndex(flat) < 0 ? flat : flat.slice(0, markerIndex(flat));
    const quote = lastQuoteAfterMarker(flat);
    if (/تعديل تعريف/.test(head)) continue;
    if (/عُ?دل صدر|عدل صدر/.test(head) && quote) {
      const pieces = quotesOf(flat);
      if (pieces[0]) text = replacePreamble(text, pieces[0]);
      const clause = flat.match(/الفقرة\s*\(\s*([0-9]+(?:\s*\/\s*[0-9]+)?)\s*\)/);
      if (clause && pieces[1]) text = replaceClause(text, clause[1].replace(/\s+/g, ""), pieces[1]);
      continue;
    }
    if (/الفقرة\s*\(/.test(head) && quote && markerIndex(flat) >= 0) {
      const clause = head.match(/الفقرة\s*\(\s*([0-9]+(?:\s*\/\s*[0-9]+)?)\s*\)/);
      if (clause) text = replaceClause(text, clause[1].replace(/\s+/g, ""), quote);
      else text = stripOwnHeading(quote, heading) || quote;
      shell = false;
      continue;
    }
    if (quote && markerIndex(flat) >= 0 && !/إضافة تعريف|بإضافة الفقرات|إضافة فقرتين|إضافة الفقرات/.test(head)) {
      text = stripOwnHeading(quote, heading) || quote;
      shell = false;
      continue;
    }
    if (/إحلال\s+(?:كلمة|عبارة)/.test(flat)) text = applySubstitutions(text, flat);
    if (/إضافة\s+عبارة/.test(flat)) text = applyInsertions(text, flat);
    if (/بإضافة الفقرات|إضافة فقرتين|إضافة تعريفين|إضافة الفقرات/.test(flat)) text = appendQuotes(text, flat);
    for (const line of quotesOf(flat)) {
      const repeated = line.match(/^(\d+)\s*\(مكرر\)/);
      if (repeated) text = insertLine(text, repeated[1], line);
    }
  }
  return { textAr: tidy(text).replace(/"+\s*(\.)?\s*$/g, (_, dot) => (dot ? "." : "")), shell, added };
}

function dropFollowingArticles(heading, text) {
  const own = parseHeading(heading);
  const kept = [];
  for (const line of String(text || "").split("\n")) {
    const trimmed = line.trim();
    if (/^الماد/.test(trimmed)) {
      const parsed = parseHeading(trimmed);
      if (parsed.ok && !(own.ok && parsed.label === own.label && parsed.kind === own.kind)) break;
    }
    kept.push(line);
  }
  return tidy(kept.join("\n"));
}

function articleHeading(heading) {
  if (parseHeading(heading).ok) return heading;
  const clause = heading.match(/(?:المادة|مادة)\s+[^:：]+/);
  if (clause && parseHeading(clause[0]).ok) return clause[0].trim();
  const match = heading.match(/(?:المادة|مادة)[\s\S]*$/);
  if (match && parseHeading(match[0]).ok) return match[0].trim();
  return heading;
}

function headingOf(item) {
  const headings = [...item.matchAll(/<h3 class="center">([\s\S]*?)<\/h3>/gi)].map((match) => htmlToText(match[1]).replace(/\s+/g, " ").trim());
  const heading = headings.find((value) => /المادة|مادة|مكرر|حالياً/.test(value)) || "";
  return heading ? articleHeading(heading) : "";
}

function labelValue(html, label) {
  const match = html.match(new RegExp(`<label[^>]*>\\s*${label}\\s*</label>\\s*<span>([\\s\\S]*?)</span>`, "i"));
  return match ? htmlToText(match[1]).replace(/\s+/g, " ").trim() : "";
}

function gregorian(value) {
  const match = String(value || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*م/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

export function parseLaborPage(html, law) {
  const scope = html.slice(Math.max(0, html.indexOf('id="divLawText"')));
  const items = extractBalanced(scope, /<div class="article_item(?!_popup)/g);
  const rows = [];
  for (const item of items) {
    const heading = headingOf(item);
    if (!heading || !parseHeading(heading).ok) continue;
    const popups = extractBalanced(item, /<div\b[^>]*class="[^"]*popup-list[^"]*"[^>]*>/gi);
    const containerText = (block) => htmlToText(block.replace(/^<div\b[^>]*>/i, "").replace(/<\/div>\s*$/i, ""));
    const popupTexts = popups.flatMap((popup) => extractBalanced(popup, /<div class="HTMLContainer">/g).map(containerText));
    let visibleHtml = item;
    for (const popup of popups) visibleHtml = visibleHtml.replace(popup, "");
    const visible = extractBalanced(visibleHtml, /<div class="HTMLContainer">/g).map(containerText).join("\n");
    const consolidated = consolidateVisible(heading, visible, popupTexts);
    rows.push({ number: heading, textAr: dropFollowingArticles(heading, consolidated.textAr), sourceUrl: law.url, shell: consolidated.shell });
    for (const extra of consolidated.added) {
      rows.push({ ...extra, textAr: dropFollowingArticles(extra.number, extra.textAr), sourceUrl: law.url });
    }
  }
  const chosen = new Map();
  for (const row of rows) {
    const label = citationLabel(row.number);
    const previous = chosen.get(label);
    if (!previous || (previous.shell && !row.shell) || !row.shell) chosen.set(label, row);
  }
  const articles = [...chosen.values()]
    .filter((row) => row.textAr && !row.textAr.includes(BAD_DEFINITION))
    .sort((left, right) => {
      const a = parseHeading(left.number);
      const b = parseHeading(right.number);
      if (a.article !== b.article) return a.article - b.article;
      return Number(a.bis) - Number(b.bis);
    })
    .map(({ number, textAr, sourceUrl }) => ({ number, textAr, sourceUrl }));
  if (!articles.length) throw new Error("No labor articles parsed");
  if (articles.some((article) => article.textAr.includes(BAD_DEFINITION))) throw new Error("Labor text has the scrambled employer definition");
  const issued = labelValue(html, "تاريخ الإصدار");
  const published = labelValue(html, "تاريخ النشر");
  const title = htmlToText((html.match(/<h1 class="system_title">([\s\S]*?)<\/h1>/i) || [, ""])[1]) || law.nameAr;
  return {
    key: law.key,
    nameAr: title,
    nameEn: title,
    sourceUrl: law.url.split("?")[0],
    version: issued || published || "boe",
    effectiveDate: gregorian(issued) || gregorian(published) || "2005-09-27",
    issuedHijri: issued,
    publishedHijri: published,
    statusLabel: labelValue(html, "الحالة"),
    isSample: false,
    courts: law.courts,
    articles,
    fetchedAt: new Date().toISOString(),
    via: "boe-reader",
    boeUrl: law.url.split("?")[0],
  };
}
