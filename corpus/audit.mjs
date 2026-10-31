import { execFile } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { collectArticles, fetchHtml, parseLawPage, searchStatute } from "./fetch-official.mjs";
import { parseLaborPage } from "./labor-page.mjs";
import { citationLabel, isBlank, isRepealed, normalizeCompare, parseHeading } from "./article-numbers.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const boeDir = path.join(root, "corpus", "official", "boe");
const GATEWAY = "https://laws-gateway.moj.gov.sa/apis/legislations/v1";
const fix = process.argv.includes("--fix");
const PARENT = { "sharia-procedure-regulation": "sharia-procedure" };
const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77,
  227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36,
  25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleIndexes(length, count, seed) {
  const random = mulberry32(seed);
  const picked = new Set();
  const guard = count * 20;
  let steps = 0;
  while (picked.size < Math.min(count, length) && steps < guard) {
    picked.add(Math.floor(random() * length));
    steps += 1;
  }
  return [...picked].sort((a, b) => a - b);
}

function sequenceReport(articles) {
  const gaps = [];
  const duplicates = [];
  const order = [];
  const bis = [];
  const repealed = [];
  const blank = [];
  const unparsed = [];
  const notes = [];
  const seen = new Map();
  let expect = 1;
  let previous = 0;
  for (const article of articles) {
    const parsed = parseHeading(article.number);
    if (!parsed.ok) {
      unparsed.push(article.number);
      continue;
    }
    if (parsed.kind === "regulation") continue;
    if (isBlank(article.textAr)) blank.push(parsed.label);
    else if (isRepealed(article.textAr)) repealed.push(parsed.label);
    if (/المادية/.test(article.number)) notes.push(article.number);
    seen.set(parsed.label, (seen.get(parsed.label) || 0) + 1);
    if (parsed.bis) {
      bis.push(parsed.label);
      if (parsed.article !== previous) order.push(`${article.number} does not follow ${previous}`);
      continue;
    }
    if (parsed.article !== expect) {
      if (parsed.article > expect) {
        for (let number = expect; number < parsed.article; number += 1) gaps.push(number);
      } else {
        order.push(`${article.number} parsed ${parsed.article} where ${expect} was next`);
      }
      expect = parsed.article + 1;
    } else {
      expect += 1;
    }
    previous = parsed.article;
  }
  for (const [label, count] of seen) if (count > 1) duplicates.push(`${label} x${count}`);
  return { gaps, duplicates, order, bis, repealed, blank, unparsed, notes, next: expect - 1 };
}

function headingBleed(articles) {
  const hits = [];
  for (let index = 0; index < articles.length; index += 1) {
    const own = parseHeading(articles[index].number);
    const lines = String(articles[index].textAr || "").split("\n").map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (!/^الماد/.test(line)) continue;
      const parsed = parseHeading(line);
      if (!parsed.ok) continue;
      if (parsed.label === own.label && parsed.kind === own.kind) continue;
      hits.push(`${own.label || articles[index].number} contains ${line}`);
    }
  }
  return hits;
}

async function gatewayModel(serial) {
  const response = await fetch(`${GATEWAY}/statute/get-Statute-gateway-Detail?Serial=${encodeURIComponent(serial)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error(`detail ${response.status}`);
  const data = await response.json();
  if (!data.success || !data.model?.statuteStructure) throw new Error(data.message || "detail had no structure");
  return data.model;
}

const BOE_PAGE_KEYS = new Set([
  "labor",
  "narcotics",
  "bribery",
  "forgery",
  "money-laundering",
  "terrorism",
  "juveniles",
  "weapons",
  "abuse",
  "trafficking",
  "traffic",
  "criminal-procedure-regulation",
  "arbitration",
  "bog",
  "bog-enforcement",
  "court-costs",
  "competition",
  "personal-data",
  "capital-market",
  "electronic-transactions",
  "ecommerce",
  "commercial-register",
  "trademarks",
  "commercial-agencies",
  "civil-service",
  "procurement",
  "social-insurance",
  "real-estate-registration",
  "expropriation",
  "discipline",
  "notary",
]);

async function officialLabor(law) {
  let html = "";
  let via = "";
  try {
    const loaded = await fetchHtml(law.sourceUrl);
    html = loaded.html;
    via = loaded.via;
  } catch (directError) {
    const reason = directError instanceof Error ? directError.message : String(directError);
    const response = await fetch(`https://r.jina.ai/${law.sourceUrl}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: { "X-Return-Format": "html", "User-Agent": "elawyer-corpus" },
    }).catch((error) => error);
    const htmlText = response instanceof Response ? await response.text() : "";
    if (response instanceof Response && response.ok && htmlText.includes("article_item")) {
      html = htmlText;
      via = "reader";
    } else {
      const archived = await archivedHtml(law.sourceUrl).catch((error) => error);
      if (archived instanceof Error || !archived) throw new Error(`${reason}; archive ${archived instanceof Error ? archived.message : "empty"}`);
      html = archived.html;
      via = `archive:${archived.timestamp}`;
    }
  }
  const parsed = parseLaborPage(html, { key: law.key, nameAr: law.nameAr, url: law.sourceUrl, courts: law.courts || ["labor", "appeal"] });
  if (!parsed.articles.length) throw new Error(`${via || "source"} parsed no labor articles`);
  return { articles: parsed.articles, via };
}

export async function officialArticles(law) {
  if (BOE_PAGE_KEYS.has(law.key)) return officialLabor(law);
  if (law.mojSerial) {
    const model = await gatewayModel(law.mojSerial);
    const source = model.bureauOfExpertsAtTheCouncilOfMinistersUrl || law.sourceUrl;
    return { articles: collectArticles(model.statuteStructure, source, []), via: "moj-gateway" };
  }
  const hit = await searchStatute(String(law.nameAr || "").trim()).catch(() => null);
  if (hit?.serial) {
    const model = await gatewayModel(hit.serial);
    const source = model.bureauOfExpertsAtTheCouncilOfMinistersUrl || law.sourceUrl;
    return { articles: collectArticles(model.statuteStructure, source, []), via: `moj-search:${hit.serial}` };
  }
  let html = "";
  let via = "";
  try {
    const loaded = await fetchHtml(law.sourceUrl);
    html = loaded.html;
    via = loaded.via;
  } catch (directError) {
    const reason = directError instanceof Error ? directError.message : String(directError);
    const archived = await archivedHtml(law.sourceUrl).catch((error) => error);
    if (archived instanceof Error || !archived) throw new Error(`${reason}; archive ${archived instanceof Error ? archived.message : "empty"}`);
    html = archived.html;
    via = `archive:${archived.timestamp}`;
  }
  const parsed = parseLawPage(html, { nameAr: law.nameAr, url: law.sourceUrl });
  const articles = parsed.articles.map((article) => ({ ...article, textAr: operativeArticleText(article.textAr) })).filter((article) => parseHeading(article.number).ok && article.textAr);
  if (!articles.length) throw new Error(`${via || "source"} parsed no articles`);
  return { articles, via };
}

async function archivedHtml(url) {
  if (!url || !url.includes("laws.boe.gov.sa")) throw new Error("no Bureau URL");
  const cdx = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&fl=timestamp,statuscode&filter=statuscode:200`;
  const response = await fetch(cdx, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`archive index ${response.status}`);
  const rows = await response.json();
  const stamps = rows.slice(1).map((row) => row[0]).reverse();
  if (!stamps.length) throw new Error("archive has no snapshot");
  let lastError = "archive page empty";
  for (const timestamp of stamps.slice(0, 6)) {
    const page = await fetch(`https://web.archive.org/web/${timestamp}id_/${url}`, {
      signal: AbortSignal.timeout(40000),
      headers: { "User-Agent": "elawyer-corpus" },
    });
    const html = await page.text();
    if (page.ok && (html.includes("article_item") || html.includes("system_title"))) return { html, timestamp };
    lastError = `archive page ${page.status}`;
  }
  throw new Error(lastError);
}

export function operativeArticleText(text) {
  let normalized = String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
  const footer = normalized.search(/حقل الإسم|data-val-required|إخلاء مسؤولية|\{\}\]\+\$|\sالإسم\s*$/);
  if (footer !== -1) normalized = normalized.slice(0, footer).trim();
  const cut = normalized.search(/تعديلات المادة/);
  if (cut === -1) return normalized;
  const before = normalized.slice(0, cut).trim();
  const after = normalized.slice(cut);
  const quoted = after.match(/لتصبح بالنص الآتي\s*:?\s*[«"“]([\s\S]*?)[»"”]/);
  if (quoted) return quoted[1].replace(/^المادة\s*\([^)]*\)\s*:\s*/, "").trim();
  const restated = after.match(/لتكون كما يل[ىي]\s*:?\s*([\s\S]+)/);
  if (restated) return restated[1].trim();
  return before;
}

function align(stored, official) {
  const used = new Set();
  const pairs = [];
  for (const article of stored) {
    const label = citationLabel(article.number);
    let match = null;
    for (let index = 0; index < official.length; index += 1) {
      if (used.has(index)) continue;
      if (citationLabel(official[index].number) !== label) continue;
      used.add(index);
      match = official[index];
      break;
    }
    pairs.push({ stored: article, official: match });
  }
  const extra = official.filter((_, index) => !used.has(index));
  return { pairs, extra };
}

function loadDatabaseUrl(envText) {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = envText.split("\n").find((item) => item.startsWith("DATABASE_URL="));
  if (!line) return "";
  return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

async function databaseRows(key) {
  const envText = await readFile(path.join(root, "apps", "api", ".env"), "utf8").catch(() => "");
  const url = loadDatabaseUrl(envText);
  if (!url) return { status: "no-database-url", rows: [] };
  const sql = `SELECT coalesce(json_agg(json_build_object('number', a.number, 'text', a."textAr") ORDER BY a.number), '[]'::json) FROM "Article" a JOIN "Law" l ON l.id = a."lawId" WHERE l.jurisdiction = 'SA' AND l.key = '${key.replace(/'/g, "")}' AND l."isSample" = false`;
  try {
    const { stdout } = await execFileAsync("psql", [url, "-At", "-c", sql], { maxBuffer: 64 * 1024 * 1024 });
    return { status: "ok", rows: JSON.parse(stdout || "[]") };
  } catch (error) {
    return { status: error instanceof Error ? error.message.slice(0, 180) : "database unread", rows: [] };
  }
}

function printRow(row) {
  const cells = [
    row.key,
    String(row.officialN ?? "unreachable"),
    String(row.storedN),
    row.gaps.join(",") || "-",
    row.duplicates.join(",") || "-",
    String(row.sampleMismatches),
    String(row.fixed),
  ];
  console.log(cells.join("\t"));
}

async function auditStatute(law, byKey) {
  const articles = law.articles || [];
  const regulation = articles.some((article) => parseHeading(article.number).kind === "regulation");
  const structural = regulation
    ? { gaps: [], duplicates: [], order: [], bis: [], repealed: [], blank: [], unparsed: [], notes: [], next: articles.length }
    : sequenceReport(articles);
  if (regulation) {
    const labels = new Map();
    for (const article of articles) {
      const parsed = parseHeading(article.number);
      if (!parsed.ok || parsed.kind !== "regulation") structural.unparsed.push(article.number);
      else labels.set(parsed.label, (labels.get(parsed.label) || 0) + 1);
      if (isBlank(article.textAr)) structural.blank.push(article.number);
      else if (isRepealed(article.textAr)) structural.repealed.push(parsed.label || article.number);
    }
    structural.duplicates = [...labels.entries()].filter(([, count]) => count > 1).map(([label, count]) => `${label} x${count}`);
  }
  const bleed = headingBleed(articles);
  const defects = [];
  if (structural.duplicates.length) defects.push(`duplicate labels: ${structural.duplicates.join(", ")}`);
  if (structural.order.length) defects.push(`out of order: ${structural.order.join("; ")}`);
  if (structural.unparsed.length) defects.push(`unparsed headings: ${structural.unparsed.join(" | ")}`);
  if (structural.blank.length) defects.push(`blank articles: ${structural.blank.join(", ")}`);
  if (bleed.length) defects.push(`heading bleed: ${bleed.slice(0, 5).join(" | ")}`);

  let official = null;
  let officialError = "";
  try {
    official = await officialArticles(law);
  } catch (error) {
    officialError = error instanceof Error ? error.message : String(error);
  }

  const row = {
    key: law.key,
    storedN: articles.length,
    officialN: null,
    via: official?.via || "",
    unreachable: official ? "" : officialError,
    gaps: structural.gaps,
    duplicates: structural.duplicates,
    bis: structural.bis,
    repealed: structural.repealed,
    blank: structural.blank,
    notes: structural.notes,
    order: structural.order,
    bleed,
    sampleMismatches: 0,
    fullMismatches: 0,
    fixed: 0,
    sample: [],
  };

  if (official) {
    row.officialN = official.articles.length;
    const officialStructure = regulation ? null : sequenceReport(official.articles);
    const live = !String(official.via || "").startsWith("archive");
    if (!regulation && officialStructure) {
      const officialGaps = new Set(officialStructure.gaps);
      const unexplained = structural.gaps.filter((gap) => !officialGaps.has(gap));
      row.gaps = unexplained;
      row.officialGaps = officialStructure.gaps;
      if (unexplained.length && live) defects.push(`gaps not on the official page: ${unexplained.join(", ")}`);
      if (official.articles.length !== articles.length && live) defects.push(`count ${articles.length} stored, ${official.articles.length} official`);
    } else if (official.articles.length !== articles.length && live) {
      defects.push(`count ${articles.length} stored, ${official.articles.length} official`);
    }
    const { pairs, extra } = align(articles, official.articles);
    if (extra.length && live) defects.push(`official articles missing from the file: ${extra.slice(0, 8).map((item) => item.number).join(" | ")}`);
    const mismatched = [];
    const indexes = new Set(sampleIndexes(articles.length, 10, 20261027 + articles.length));
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      const differs = !pair.official || normalizeCompare(pair.stored.textAr) !== normalizeCompare(pair.official.textAr);
      if (indexes.has(index)) {
        if (differs) row.sampleMismatches += 1;
        row.sample.push({ number: pair.stored.number, ok: !differs });
      }
      if (!differs) continue;
      mismatched.push({ number: pair.stored.number, reason: pair.official ? "text" : "no official row for this label" });
      if (fix && live && pair.official) {
        pair.stored.textAr = pair.official.textAr;
        if (citationLabel(pair.stored.number) !== citationLabel(pair.official.number) || !parseHeading(pair.stored.number).ok) {
          pair.stored.number = pair.official.number;
        }
        row.fixed += 1;
      }
    }
    if (fix && live) {
      const before = law.articles.length;
      law.articles = law.articles.filter((article) => parseHeading(article.number).ok);
      row.fixed += before - law.articles.length;
      for (const article of extra) {
        if (law.articles.some((item) => citationLabel(item.number) === citationLabel(article.number))) continue;
        law.articles.push({ number: article.number, textAr: article.textAr, sourceUrl: article.sourceUrl || law.sourceUrl });
        row.fixed += 1;
      }
    }
    row.fullMismatches = mismatched.length;
    row.archiveDiffs = live ? 0 : mismatched.length;
    if (mismatched.length && live) defects.push(`text mismatches: ${mismatched.slice(0, 8).map((item) => item.number).join(" | ")}`);
  } else if (structural.gaps.length) {
    // The archived Bureau labor page does not publish these numbers. A hole that is not one of them still fails when the live page cannot be read.
    const omittedByStatute = law.key === "labor" ? new Set([240, 242]) : new Set();
    const unexpected = structural.gaps.filter((number) => !omittedByStatute.has(number));
    if (unexpected.length) defects.push(`gaps with the official page unreachable: ${unexpected.join(", ")}`);
  }

  if (regulation) {
    const parentKey = PARENT[law.key];
    const parent = parentKey ? byKey.get(parentKey) : null;
    if (parent) {
      const parentArticles = new Set((parent.articles || []).map((article) => parseHeading(article.number).article).filter((value) => value));
      const missing = [];
      for (const article of articles) {
        const parsed = parseHeading(article.number);
        if (parsed.ok && !parentArticles.has(parsed.article)) missing.push(parsed.label);
      }
      row.missingParents = [...new Set(missing)];
      if (row.missingParents.length) defects.push(`regulation points at missing statute articles: ${row.missingParents.slice(0, 8).join(", ")}`);
    }
  }

  row.defects = defects;
  return row;
}

function quranOk(reference) {
  const match = /^(\d+):(\d+)(?:-(\d+))?$/.exec(reference);
  if (!match) return false;
  const surah = Number(match[1]);
  const start = Number(match[2]);
  const end = match[3] ? Number(match[3]) : start;
  const count = AYAH_COUNTS[surah - 1];
  return surah >= 1 && surah <= 114 && count != null && start >= 1 && end <= count && start <= end;
}

async function auditQuran() {
  const text = await readFile(path.join(root, "corpus", "official", "tanzil", "quran-uthmani.txt"), "utf8");
  const perSurah = new Map();
  const defects = [];
  let rows = 0;
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const match = /^(\d+)\|(\d+)\|(.*)$/.exec(line);
    if (!match) {
      defects.push(`unparsed line: ${line.slice(0, 40)}`);
      continue;
    }
    rows += 1;
    const surah = Number(match[1]);
    const ayah = Number(match[2]);
    if (!perSurah.has(surah)) perSurah.set(surah, []);
    perSurah.get(surah).push(ayah);
    if (!match[3].trim()) defects.push(`blank ${surah}:${ayah}`);
    if (!quranOk(`${surah}:${ayah}`)) defects.push(`out of range ${surah}:${ayah}`);
  }
  if (perSurah.size !== 114) defects.push(`surah count ${perSurah.size}`);
  for (let surah = 1; surah <= 114; surah += 1) {
    const ayahs = perSurah.get(surah) || [];
    const expected = AYAH_COUNTS[surah - 1];
    const unique = new Set(ayahs);
    if (ayahs.length !== unique.size) defects.push(`duplicate ayah in surah ${surah}`);
    if (ayahs.length !== expected) defects.push(`surah ${surah} has ${ayahs.length}, canonical ${expected}`);
    for (let ayah = 1; ayah <= expected; ayah += 1) if (!unique.has(ayah)) defects.push(`missing ${surah}:${ayah}`);
  }
  if (!quranOk("2:282") || !quranOk("2:282-286") || quranOk("2:282-287") || quranOk("115:1")) defects.push("range checker failed its own cases");
  return { rows, surahs: perSurah.size, defects };
}

async function auditHadith() {
  const summary = JSON.parse(await readFile(path.join(root, "corpus", "official", "hadith", "summary.json"), "utf8"));
  const files = (await readdir(path.join(root, "corpus", "official", "hadith"))).filter((name) => name.endsWith(".min.json"));
  const books = [];
  const defects = [];
  for (const file of files.sort()) {
    const parsed = JSON.parse(await readFile(path.join(root, "corpus", "official", "hadith", file), "utf8"));
    const edition = file.replace(".min.json", "");
    const listed = summary.find((item) => item.edition === edition);
    const hadiths = parsed.hadiths || [];
    if (!listed) defects.push(`${edition} missing from summary`);
    else if (listed.count !== hadiths.length) defects.push(`${edition} summary ${listed.count} file ${hadiths.length}`);
    const global = new Set();
    const perBook = new Map();
    let missingText = 0;
    let missingNumber = 0;
    let repeatedInBook = 0;
    for (const item of hadiths) {
      if (!item.text) missingText += 1;
      if (item.hadithnumber == null || item.reference?.book == null || item.reference?.hadith == null) {
        if (item.text) missingNumber += 1;
        continue;
      }
      if (global.has(item.hadithnumber)) defects.push(`${edition} duplicate hadithnumber ${item.hadithnumber}`);
      global.add(item.hadithnumber);
      const book = item.reference.book;
      const number = item.reference.hadith;
      if (!perBook.has(book)) perBook.set(book, new Map());
      const set = perBook.get(book);
      set.set(number, (set.get(number) || 0) + 1);
    }
    for (const set of perBook.values()) {
      for (const count of set.values()) if (count > 1) repeatedInBook += 1;
    }
    if (missingNumber) defects.push(`${edition} rows with text and no number: ${missingNumber}`);
    books.push({ edition, count: hadiths.length, books: perBook.size, missingText, repeatedInBook });
  }
  for (const item of summary) {
    if (!files.includes(`${item.edition}.min.json`)) defects.push(`summary edition missing on disk: ${item.edition}`);
  }
  return { books, defects };
}

async function drafterDistinct() {
  const draft = await readFile(path.join(root, "apps", "api", "src", "domain", "draft.ts"), "utf8");
  const validator = await readFile(path.join(root, "apps", "api", "src", "domain", "citations.ts"), "utf8");
  const defects = [];
  if (!draft.includes("citationLabel(article.number)") || !draft.includes("article.lawNameAr") || !draft.includes("textHash(article.textAr)")) {
    defects.push("drafter citation must include the statute name, the full article label, and the text hash");
  }
  if (!validator.includes("statute:")) defects.push("validator must reject an article number that belongs to another statute");
  const slash = citationLabel("١/٣٠");
  const statute = citationLabel("المادة الأولى");
  if (slash === statute) defects.push("regulation label 1/30 collides with statute article 1");
  return defects;
}

async function main() {
  const fixture = JSON.parse(await readFile(path.join(root, "corpus", "number-fixtures.json"), "utf8"));
  const fixtureDefects = [];
  for (const [heading, label] of fixture) {
    if (citationLabel(heading) !== label) fixtureDefects.push(`${heading} => ${citationLabel(heading)} expected ${label}`);
  }
  const names = (await readdir(boeDir)).filter((name) => name.endsWith(".json") && name !== "manifest-report.json" && name !== "blocked.json");
  const laws = [];
  for (const name of names) laws.push(JSON.parse(await readFile(path.join(boeDir, name), "utf8")));
  const byKey = new Map(laws.map((law) => [law.key, law]));
  if (laws.length !== 50) fixtureDefects.push(`expected 50 statutes, found ${laws.length}`);
  const labor = byKey.get("labor");
  if (!labor) fixtureDefects.push("labor statute missing");
  else {
    const labels = new Set((labor.articles || []).map((article) => citationLabel(article.number)));
    for (const label of ["11 مكرر", "79 مكرر", "131 مكرر", "229 مكرر", "84", "88", "90"]) {
      if (!labels.has(label)) fixtureDefects.push(`labor missing article ${label}`);
    }
    const article2 = (labor.articles || []).find((article) => citationLabel(article.number) === "2");
    if (!article2 || !article2.textAr.includes("طبيعي أو اعتباري") || article2.textAr.includes("صاحب العمل: كل شخص طبيعي يعمل لمصلحة صاحب عمل")) {
      fixtureDefects.push("labor article 2 is not the consolidated text");
    }
  }
  const bribery = byKey.get("bribery");
  if (!bribery) fixtureDefects.push("bribery statute missing");
  else {
    const labels = new Set((bribery.articles || []).map((article) => citationLabel(article.number)));
    for (const label of ["9", "9 مكرر (1)", "9 مكرر (2)"]) {
      if (!labels.has(label)) fixtureDefects.push(`bribery missing article ${label}`);
    }
    const article9 = (bribery.articles || []).find((article) => citationLabel(article.number) === "9");
    if (!article9 || !article9.textAr.includes("أو وعد بها") || article9.textAr.includes("إضافة مادتين")) {
      fixtureDefects.push("bribery article 9 is not the consolidated text");
    }
  }
  const narcotics = byKey.get("narcotics");
  if (!narcotics || (narcotics.articles || []).length !== 74) fixtureDefects.push("narcotics statute is not the 74-article text");
  const traffic = byKey.get("traffic");
  if (!traffic || (traffic.articles || []).length !== 85) fixtureDefects.push("traffic statute is not the full 85-article text");
  const rows = [];
  for (const law of laws.sort((a, b) => a.key.localeCompare(b.key))) {
    process.stderr.write(`audit ${law.key}\n`);
    const row = await auditStatute(law, byKey);
    rows.push(row);
    if (fix && row.fixed > 0) await writeFile(path.join(boeDir, `${law.key}.json`), JSON.stringify(law));
  }
  const quran = await auditQuran();
  const hadith = await auditHadith();
  const drafter = await drafterDistinct();
  let database = "not checked";
  const dbDefects = [];
  const probe = await databaseRows(rows[0]?.key || "advocacy");
  if (probe.status !== "ok") database = probe.status;
  else if (probe.rows.length === 0) database = "empty";
  else {
    database = "compared";
    for (const row of rows) {
      const loaded = row.key === rows[0].key ? probe : await databaseRows(row.key);
      if (loaded.status !== "ok") {
        dbDefects.push(`${row.key} ${loaded.status}`);
        continue;
      }
      if (loaded.rows.length !== row.storedN) dbDefects.push(`${row.key} database ${loaded.rows.length} file ${row.storedN}`);
      const fileByNumber = new Map((byKey.get(row.key).articles || []).map((article) => [article.number, normalizeCompare(article.textAr)]));
      for (const item of loaded.rows) {
        if (!fileByNumber.has(item.number)) dbDefects.push(`${row.key} database heading not in file: ${item.number}`);
        else if (fileByNumber.get(item.number) !== normalizeCompare(item.text)) dbDefects.push(`${row.key} database text differs: ${item.number}`);
      }
    }
  }
  console.log("key\tofficialN\tstoredN\tgaps\tduplicates\tsampleMismatches\tfixed");
  for (const row of rows) printRow(row);
  for (const row of rows) {
    console.log(`\n# ${row.key}`);
    console.log(`stored ${row.storedN} official ${row.officialN ?? "unreachable"} via ${row.via || "-"}`);
    if (row.unreachable) console.log(`official page not reached: ${row.unreachable}`);
    if (String(row.via).startsWith("archive")) console.log(`live page not reached; archive ${row.via}; text differences ${row.archiveDiffs || 0} reported, not failed`);
    if (row.bis.length) console.log(`bis: ${row.bis.join(", ")}`);
    if (row.repealed.length) console.log(`repealed: ${row.repealed.join(", ")}`);
    if (row.notes.length) console.log(`official heading kept as published: ${row.notes.join(", ")}`);
    if (row.officialGaps?.length) console.log(`official gaps: ${row.officialGaps.join(", ")}`);
    if (row.missingParents?.length) console.log(`missing parent articles: ${row.missingParents.join(", ")}`);
    if (row.key === "commercial-courts-regulation") {
      console.log("regulation keeps its own 1..N sequence; the drafter cites it by instrument name plus that number");
    }
    console.log(`sample: ${row.sample.map((item) => `${item.number} ${item.ok ? "match" : "DIFF"}`).join(" | ") || "-"}`);
    if (row.defects.length) console.log(`defects: ${row.defects.join(" || ")}`);
  }
  console.log(`\nquran rows ${quran.rows} surahs ${quran.surahs}`);
  if (quran.defects.length) console.log(`quran defects: ${quran.defects.join(" || ")}`);
  const importer = await readFile(path.join(root, "apps", "api", "src", "corpus.service.ts"), "utf8");
  if (!importer.includes("hadith:${edition}:${hadith.hadithnumber}")) hadith.defects.push("importer key does not use the unique hadithnumber");
  if (!importer.includes("hadith.hadithnumber")) hadith.defects.push("importer reference does not keep the unique hadithnumber");
  for (const book of hadith.books) {
    console.log(`hadith ${book.edition} ${book.count} books ${book.books} emptyText ${book.missingText} repeatedInBookNumbers ${book.repeatedInBook}`);
  }
  if (hadith.defects.length) console.log(`hadith defects: ${hadith.defects.join(" || ")}`);
  console.log(`database ${database}`);
  const defects = [
    ...fixtureDefects,
    ...rows.flatMap((row) => row.defects.map((item) => `${row.key}: ${item}`)),
    ...quran.defects.map((item) => `quran: ${item}`),
    ...hadith.defects.map((item) => `hadith: ${item}`),
    ...drafter.map((item) => `drafter: ${item}`),
    ...dbDefects.map((item) => `database: ${item}`),
  ];
  if (defects.length) {
    console.log(`\nFAILED ${defects.length}`);
    for (const item of defects) console.log(`- ${item}`);
    process.exit(1);
  }
  console.log("\nOK");
}

if (process.argv[1] && process.argv[1].endsWith("audit.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
