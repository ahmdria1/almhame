import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "corpus", "official");

export const LAWS = [
  { key: "sharia-procedure", nameAr: "نظام المرافعات الشرعية", courts: ["general", "appeal", "supreme"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/f0eaae46-9f84-40ee-815e-a9a700f268b3/1" },
  { key: "evidence", nameAr: "نظام الإثبات", courts: ["general", "commercial", "personal_status", "labor", "criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/2716057c-c097-4bad-8e1e-ae1400c678d5/1" },
  { key: "civil-transactions", nameAr: "نظام المعاملات المدنية", courts: ["general", "commercial", "personal_status", "labor"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/655fdb42-8c96-422b-b8c4-b04f0095c94c/1" },
  { key: "personal-status", nameAr: "نظام الأحوال الشخصية", courts: ["personal_status", "appeal", "supreme"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/4d72d829-947b-45d5-b9b5-ae5800d6bac2/1" },
  { key: "labor", nameAr: "نظام العمل", courts: ["labor", "appeal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/08381293-6388-48e2-8ad2-a9a700f2aa94/1" },
  { key: "criminal-procedure", nameAr: "نظام الإجراءات الجزائية", courts: ["criminal", "appeal", "supreme"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/8f1b7079-a5f0-425d-b5e0-a9a700f26b2d/1" },
  { key: "commercial-courts", nameAr: "نظام المحاكم التجارية", courts: ["commercial", "appeal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/38334008-3b70-4c6c-b3af-aba3016a8061/1" },
  { key: "enforcement", nameAr: "نظام التنفيذ", courts: ["enforcement"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/c81ba2f1-1bf1-443b-9b1c-a9a700f27110/1" },
  { key: "bog-procedure", nameAr: "نظام المرافعات أمام ديوان المظالم", courts: ["administrative", "appeal", "supreme"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/f2f7b465-b576-4f47-a8e7-a9a700f27202/1" },
  { key: "judiciary", nameAr: "نظام القضاء", courts: ["general", "appeal", "supreme"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/ea1765a3-dec3-41a0-a32f-a9a700f26d58/1" },
  { key: "companies", nameAr: "نظام الشركات", courts: ["commercial"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/a8376aea-1bc3-49d4-9027-aed900b555af/1" },
  { key: "advocacy", nameAr: "نظام المحاماة", courts: ["general", "commercial", "administrative"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/f42655be-79b0-4fd4-bb90-a9a700f26a3e/1" },
  { key: "bankruptcy", nameAr: "نظام الإفلاس", courts: ["commercial"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/68204119-84f1-4789-8fad-a9ec014c3788/1" },
  { key: "commercial-papers", nameAr: "نظام الأوراق التجارية", courts: ["commercial"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/4763eb94-047b-46f1-9697-a9a700f1b7ed/1" },
  { key: "cybercrime", nameAr: "نظام مكافحة جرائم المعلوماتية", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/25df73d6-0f49-4dc5-b010-a9a700f2ec1d/1" },
  { key: "harassment", nameAr: "نظام مكافحة جريمة التحرش", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/f9de1b7f-7526-4c44-b9f3-a9f8015cf5b6/1" },
  { key: "commercial-fraud", nameAr: "نظام مكافحة الغش التجاري", courts: ["commercial", "criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/85eb2897-bec6-4c0c-b1d7-ac7c008ec09c/1" },
  { key: "financial-fraud", nameAr: "نظام مكافحة الاحتيال المالي وخيانة الأمانة", courts: ["criminal", "commercial"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/905e11b3-4d66-496c-9c1b-ad240106367f/1" },
  { key: "narcotics", nameAr: "نظام مكافحة المخدرات والمؤثرات العقلية", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/221b3286-a3c6-4ea4-97c7-a9a700f18273/1" },
  { key: "bribery", nameAr: "نظام مكافحة الرشوة", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/75e963c8-9ff3-4d10-88a4-a9a700f17f21/1" },
  { key: "forgery", nameAr: "النظام الجزائي لجرائم التزوير", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/c1878d16-7ce0-4710-993b-a9a700f17ac5/1" },
  { key: "money-laundering", nameAr: "نظام مكافحة غسل الأموال", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/0657dfce-95f8-463a-9d87-aa3900ec7b51/1" },
  { key: "terrorism", nameAr: "نظام مكافحة جرائم الإرهاب وتمويله", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/57694209-3eed-46c7-a5d8-a9ed012761d4/1" },
  { key: "juveniles", nameAr: "نظام الأحداث", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/4ec27eee-f917-408c-85eb-a9f6011ea426/1" },
  { key: "weapons", nameAr: "نظام الأسلحة والذخائر", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/a445af93-671f-496b-818a-a9a700f19150/1" },
  { key: "abuse", nameAr: "نظام الحماية من الإيذاء", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/83f450eb-7985-461f-b053-a9a700f2ba08/1" },
  { key: "trafficking", nameAr: "نظام مكافحة جرائم الاتجار بالأشخاص", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/4e09c59d-f173-4971-8a38-a9a700f27025/1" },
  { key: "traffic", nameAr: "نظام المرور", courts: ["criminal"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/85364e57-c01e-41ba-8def-a9a700f183e9/1" },
  { key: "criminal-procedure-regulation", nameAr: "اللائحة التنفيذية لنظام الإجراءات الجزائية", courts: ["criminal", "appeal", "supreme"], url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/9a0249b7-f835-48fa-8d1e-a9a700f1981a/1" },
  { key: "sharia-procedure-regulation", nameAr: "اللوائح التنفيذية لنظام المرافعات الشرعية", courts: ["general", "appeal", "supreme"], url: "" },
  { key: "commercial-courts-regulation", nameAr: "اللائحة التنفيذية لنظام المحاكم التجارية", courts: ["commercial", "appeal"], url: "" },
];

const GATEWAY = "https://laws-gateway.moj.gov.sa/apis/legislations/v1";

const HADITH = [
  ["bukhari", "ara-bukhari", "صحيح البخاري"],
  ["muslim", "ara-muslim", "صحيح مسلم"],
  ["abudawud", "ara-abudawud", "سنن أبي داود"],
  ["tirmidhi", "ara-tirmidhi", "جامع الترمذي"],
  ["nasai", "ara-nasai", "سنن النسائي"],
  ["ibnmajah", "ara-ibnmajah", "سنن ابن ماجه"],
  ["malik", "ara-malik", "موطأ مالك"],
];

function decode(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export function htmlToText(fragment) {
  let html = fragment.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  let index = 0;
  html = html.replace(/<ol\b[^>]*>/gi, () => {
    index = 0;
    return "\n";
  });
  html = html.replace(/<li\b[^>]*>/gi, () => {
    index += 1;
    return `\n${index}. `;
  });
  html = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h\d|li|tr)>/gi, "\n");
  html = html.replace(/<[^>]+>/g, "");
  const text = decode(html)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return text;
}

function labelValue(html, label) {
  const match = html.match(new RegExp(`<label[^>]*>\\s*${label}\\s*</label>\\s*<span>([\\s\\S]*?)</span>`, "i"));
  if (!match) return "";
  return htmlToText(match[1]).replace(/\s+/g, " ").trim();
}

function gregorian(value) {
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*م/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

export function parseLawPage(html, law) {
  const title = htmlToText((html.match(/<h1 class="system_title">([\s\S]*?)<\/h1>/i) || [, ""])[1]) || law.nameAr;
  const issued = labelValue(html, "تاريخ الإصدار");
  const published = labelValue(html, "تاريخ النشر");
  const status = labelValue(html, "الحالة");
  const chunks = [...html.matchAll(/<h3 class="center">\s*(المادة[\s\S]*?)<\/h3>([\s\S]*?)(?=<h3 class="center">\s*المادة|$)/gi)];
  const articles = [];
  const seen = new Set();
  for (const chunk of chunks) {
    const heading = htmlToText(chunk[1]).replace(/\s+/g, " ").trim();
    if (!heading.startsWith("المادة")) continue;
    const body = htmlToText(chunk[2]);
    if (!body) continue;
    const key = heading;
    if (seen.has(key)) {
      const previous = articles[articles.length - 1];
      if (previous && previous.number === heading) previous.textAr = `${previous.textAr}\n${body}`.trim();
      continue;
    }
    seen.add(key);
    articles.push({
      number: heading,
      textAr: body,
      sourceUrl: law.url,
    });
  }
  if (!articles.length) throw new Error(`No articles parsed for ${law.key}`);
  return {
    key: law.key,
    nameAr: title,
    nameEn: title,
    sourceUrl: law.url.split("?")[0],
    version: issued || published || "boe",
    effectiveDate: gregorian(issued) || gregorian(published) || "1970-01-01",
    issuedHijri: issued,
    publishedHijri: published,
    statusLabel: status,
    isSample: false,
    courts: law.courts,
    articles,
    fetchedAt: new Date().toISOString(),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isoDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1900 || year > 2100) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function collectArticles(nodes, sourceUrl, bucket) {
  for (const node of nodes || []) {
    if (String(node.type) === "1") {
      const textAr = htmlToText(node.text || "");
      const number = String(node.sequence || node.name || "").replace(/\s+/g, " ").trim();
      if (number && textAr) {
        const seen = bucket.filter((item) => item.number === number).length;
        bucket.push({
          number: seen ? `${number} (${seen + 1})` : number,
          textAr,
          sourceUrl,
        });
      }
    }
    if (Array.isArray(node.items)) collectArticles(node.items, sourceUrl, bucket);
  }
  return bucket;
}

export async function searchStatute(name) {
  const response = await fetch(`${GATEWAY}/statute/section-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      pageNumber: 1,
      pageSize: 10,
      term: "",
      LegalStatue: null,
      classificationId: null,
      sortingBy: 7,
      statuteName: name,
      detailsKeyword: "",
      statuteType: null,
      type: 1,
    }),
    signal: AbortSignal.timeout(40000),
  });
  if (!response.ok) throw new Error(`MOJ search ${response.status}`);
  const data = await response.json();
  const collection = data?.model?.collection || [];
  return collection.find((item) => item.statuteName === name) || collection[0] || null;
}

async function fetchMoj(law) {
  const hit = await searchStatute(law.nameAr);
  if (!hit?.serial) throw new Error(`MOJ search returned no statute for ${law.nameAr}`);
  const response = await fetch(`${GATEWAY}/statute/get-Statute-gateway-Detail?Serial=${encodeURIComponent(hit.serial)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`MOJ detail ${response.status}`);
  const data = await response.json();
  if (!data.success || !data.model) throw new Error(data.message || "MOJ detail failed");
  const model = data.model;
  const sourceUrl = model.bureauOfExpertsAtTheCouncilOfMinistersUrl || `https://laws.moj.gov.sa/ar/legislation/${encodeURIComponent(hit.serial)}`;
  const articles = collectArticles(model.statuteStructure, sourceUrl, []);
  if (!articles.length) throw new Error(`No articles in MOJ detail for ${law.nameAr}`);
  const decree = model.changeDecree || {};
  const effective = isoDate(model.issuanceDateGerogian) || isoDate(model.publishDateGerogian) || isoDate(decree.gregorianDecreeDate) || isoDate(model.gregorianValidFromDate);
  return {
    key: law.key,
    nameAr: model.name || law.nameAr,
    nameEn: model.name || law.nameAr,
    sourceUrl: sourceUrl.split("?")[0],
    version: [decree.decree, decree.decreeDate].filter(Boolean).join(" ").trim() || model.issuanceDepartmentTool || "moj",
    effectiveDate: effective || "1970-01-01",
    issuedHijri: String(model.issuanceDate || "").slice(0, 10),
    publishedHijri: String(model.publishDate || "").slice(0, 10),
    statusLabel: model.legalStatueName || "",
    isSample: false,
    courts: law.courts,
    articles,
    fetchedAt: new Date().toISOString(),
    via: "moj-gateway",
    mojSerial: hit.serial,
    boeUrl: model.bureauOfExpertsAtTheCouncilOfMinistersUrl || "",
  };
}

let bureauReachable = null;

export async function fetchHtml(url) {
  if (!url) throw new Error("No Bureau URL");
  if (bureauReachable === false) throw new Error("Bureau TLS unreachable in this run");
  const direct = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "elawyer-corpus" } }).catch((error) => error);
  if (direct instanceof Response && direct.ok) {
    const text = await direct.text();
    if (text.includes("article_item") || text.includes("system_title")) {
      bureauReachable = true;
      return { html: text, via: "direct" };
    }
  }
  const timedOut = !(direct instanceof Response);
  if (timedOut) {
    bureauReachable = false;
    throw new Error(String(direct).slice(0, 180));
  }
  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: { "X-Return-Format": "html", "User-Agent": "elawyer-corpus" },
    });
    const html = await response.text();
    if (response.ok && (html.includes("article_item") || html.includes("system_title"))) return { html, via: "reader" };
    throw new Error(`Reader ${response.status} ${html.slice(0, 120)}`);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

async function fetchQuran() {
  const target = path.join(outDir, "tanzil", "quran-uthmani.txt");
  const params = new URLSearchParams({ quranType: "uthmani", outType: "txt-2", agree: "true", marks: "true", sajdah: "true", tatweel: "true" });
  const response = await fetch(`https://tanzil.net/pub/download/index.php?${params}`, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Tanzil ${response.status}`);
  const text = await response.text();
  if (!text.includes("1|1|")) throw new Error("Tanzil file did not look like Uthmani ayah text");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
  const lines = text.split(/\n/).filter((line) => /^\d+\|\d+\|/.test(line));
  return { lines: lines.length, path: target };
}

async function fetchHadith() {
  const dir = path.join(outDir, "hadith");
  await mkdir(dir, { recursive: true });
  const summary = [];
  for (const [key, edition, nameAr] of HADITH) {
    const url = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${edition}.min.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`${edition} ${response.status}`);
    const raw = await response.text();
    const parsed = JSON.parse(raw);
    const hadiths = parsed.hadiths || [];
    const file = path.join(dir, `${edition}.min.json`);
    await writeFile(file, raw);
    const sample = hadiths[0] || {};
    summary.push({
      key,
      edition,
      nameAr,
      count: hadiths.length,
      sourceUrl: url,
      gradeField: Array.isArray(sample.grades),
      sampleGrades: sample.grades || [],
      sampleRef: sample.reference || null,
    });
    console.log("hadith", edition, hadiths.length);
  }
  await writeFile(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2));
  return summary;
}

async function probeMaxims() {
  const attempts = [];
  const urls = [
    "https://ar.wikisource.org/w/api.php?action=opensearch&search=" + encodeURIComponent("مجلة الأحكام العدلية") + "&format=json",
    "https://ar.wikisource.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent("الأشباه والنظائر السيوطي") + "&format=json",
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const body = await response.text();
      attempts.push({ url, status: response.status, excerpt: body.slice(0, 500) });
    } catch (error) {
      attempts.push({ url, error: String(error) });
    }
  }
  const note = {
    status: "blocked",
    reason: "No machine-readable edition of a published qawaid work was downloaded. Wikisource search was probed and is recorded below. Statute, Quran, and hadith texts were not used as a substitute.",
    attempts,
  };
  await mkdir(path.join(outDir, "maxims"), { recursive: true });
  await writeFile(path.join(outDir, "maxims", "status.json"), JSON.stringify(note, null, 2));
  return note;
}

async function main() {
  const only = process.argv.slice(2);
  await mkdir(path.join(outDir, "boe"), { recursive: true });
  const selected = only.length ? LAWS.filter((law) => only.includes(law.key)) : LAWS;
  const report = [];
  for (const law of selected) {
    process.stdout.write(`fetch ${law.key} ... `);
    try {
      let parsed;
      let via = "boe";
      try {
        const loaded = await fetchHtml(law.url);
        const pageKeys = new Set(["labor", "narcotics", "bribery", "forgery", "money-laundering", "terrorism", "juveniles", "weapons", "abuse", "trafficking", "traffic", "criminal-procedure-regulation"]);
        if (pageKeys.has(law.key)) {
          const { parseLaborPage } = await import("./labor-page.mjs");
          parsed = parseLaborPage(loaded.html, law);
        } else {
          parsed = parseLawPage(loaded.html, law);
        }
        via = loaded.via;
        await writeFile(path.join(outDir, "boe", `${law.key}.html`), loaded.html);
      } catch (boeError) {
        const reason = boeError instanceof Error ? boeError.message : String(boeError);
        parsed = await fetchMoj(law);
        via = `moj-gateway after BOE: ${reason.slice(0, 180)}`;
      }
      await writeFile(path.join(outDir, "boe", `${law.key}.json`), JSON.stringify(parsed));
      console.log(parsed.articles.length, parsed.effectiveDate, parsed.statusLabel || "");
      report.push({
        key: law.key,
        nameAr: parsed.nameAr,
        articles: parsed.articles.length,
        via,
        effectiveDate: parsed.effectiveDate,
        issuedHijri: parsed.issuedHijri,
        publishedHijri: parsed.publishedHijri,
        statusLabel: parsed.statusLabel,
        sourceUrl: parsed.sourceUrl,
        boeUrl: parsed.boeUrl || parsed.sourceUrl,
      });
      await sleep(400);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log("FAILED", message);
      report.push({ key: law.key, nameAr: law.nameAr, error: message, sourceUrl: law.url });
    }
  }
  await writeFile(path.join(outDir, "boe", "manifest-report.json"), JSON.stringify(report, null, 2));
  const blocked = report.filter((row) => row.error).map((row) => ({ key: row.key, nameAr: row.nameAr, reason: row.error, sourceUrl: row.sourceUrl }));
  await writeFile(path.join(outDir, "boe", "blocked.json"), JSON.stringify(blocked, null, 2));
  if (!only.length || selected.length) {
    await execFileAsync("python3", [path.join(root, "corpus", "snapshot_fallback.py")], { cwd: root }).catch((error) => {
      console.log("snapshot fallback", error instanceof Error ? error.message : error);
    });
  }
  if (!only.length || only.includes("quran")) {
    const quran = await fetchQuran();
    console.log("quran", quran.lines);
  }
  if (!only.length || only.includes("hadith")) {
    await fetchHadith();
  }
  if (!only.length || only.includes("maxims")) {
    const maxims = await probeMaxims();
    console.log("maxims", maxims.status);
  }
}

if (process.argv[1] && process.argv[1].endsWith("fetch-official.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
