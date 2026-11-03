import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectArticles } from "./fetch-official.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const boeDir = path.join(root, "corpus", "official", "boe");

const ORDINAL_HEADINGS = [
  "أولاً",
  "ثانيًا",
  "ثالثًا",
  "رابعًا",
  "خامسًا",
  "سادسًا",
  "سابعًا",
  "ثامناً",
  "تاسعًا",
  "عاشرًا",
  "حادي عشر",
  "ثاني عشر",
];

export function lawFromGateway(model, law) {
  const sourceUrl = (model.bureauOfExpertsAtTheCouncilOfMinistersUrl || `https://laws.moj.gov.sa/ar/legislation/${encodeURIComponent(model.serial)}`).split("?")[0];
  const articles = collectArticles(model.statuteStructure, sourceUrl, []);
  const gregorian = String(model.gregorianValidFromDate || model.validFromDate || "").slice(0, 10);
  const verified = /^\d{4}-\d{2}-\d{2}$/.test(gregorian) && Number(gregorian.slice(0, 4)) >= 1900 && Number(gregorian.slice(0, 4)) <= 2100;
  return {
    key: law.key,
    nameAr: model.name || law.nameAr,
    nameEn: model.name || law.nameAr,
    sourceUrl,
    version: model.issuanceDepartmentTool || "moj",
    effectiveDate: verified && law.trustGatewayDate ? gregorian : null,
    effectiveDateStatus: verified && law.trustGatewayDate ? "verified" : "unverified",
    gatewayValidFrom: verified ? gregorian : "",
    issuedHijri: String(model.issuanceDate || "").slice(0, 10),
    publishedHijri: String(model.publishDate || "").slice(0, 10),
    statusLabel: model.legalStatueName || "",
    legalStatus: model.legalStatus || "",
    isSample: false,
    citeable: law.citeable !== false,
    courts: law.courts,
    mojSerial: model.serial,
    fetchedAt: new Date().toISOString(),
    articles,
  };
}

export function rentalClauses(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\u00a0/g, " ");
  const start = text.indexOf("أولاً: لأغراض");
  if (start < 0) throw new Error("rental provisions heading was not found");
  const body = text.slice(start);
  const marks = ORDINAL_HEADINGS.map((heading) => {
    const at = body.indexOf(heading);
    if (at < 0) throw new Error(`missing clause ${heading}`);
    return { heading, at };
  });
  for (let index = 1; index < marks.length; index += 1) {
    if (marks[index].at <= marks[index - 1].at) throw new Error(`clause order ${marks[index].heading}`);
  }
  const articles = marks.map((mark, index) => {
    const end = index + 1 < marks.length ? marks[index + 1].at : body.search(/\n\s*ملفات تعريف الارتباط/);
    const chunk = body.slice(mark.at, end > mark.at ? end : undefined).replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
    return {
      number: mark.heading,
      textAr: chunk,
      sourceUrl: "https://rega.gov.sa/الأنظمة-والقرارات/الأنظمة-واللوائح-والأدلة/الأنظمة/الأحكام-النظامية-الخاصة-بضبط-العلاقة-بين-المؤجر-والمستأجر/",
    };
  });
  return articles;
}

export function splitMaxims(articleText) {
  const marker = "القاعدة ";
  const at = articleText.indexOf(marker);
  if (at < 0) throw new Error("article 720 has no numbered maxim");
  const preamble = articleText.slice(0, at).trim();
  const rest = articleText.slice(at).trim();
  const parts = rest.split(/\n(?=القاعدة )/g).map((part) => part.trim()).filter(Boolean);
  return {
    preamble,
    rules: parts.map((part) => {
      const lines = part.split(/\n+/).map((line) => line.trim()).filter(Boolean);
      const heading = lines[0].replace(/:\s*$/, "");
      const textAr = lines.slice(1).join("\n").trim();
      if (!heading.startsWith("القاعدة ") || !textAr) throw new Error(`maxim split failed: ${part.slice(0, 40)}`);
      return { number: heading, textAr };
    }),
  };
}

async function writeLaw(record) {
  await writeFile(path.join(boeDir, `${record.key}.json`), JSON.stringify(record));
}

async function main() {
  const cache = process.argv[2];
  if (!cache) throw new Error("pass the directory of gateway JSON files");
  const specs = [
    ["enforcement-1447.json", { key: "enforcement", nameAr: "نظام التنفيذ", courts: ["enforcement"], trustGatewayDate: false, citeable: true }],
    ["enforcement-reg-1448.json", { key: "enforcement-regulation", nameAr: "اللائحة التنفيذية لنظام التنفيذ", courts: ["enforcement"], trustGatewayDate: false, citeable: true }],
    ["evidence-procedure.json", { key: "evidence-procedure", nameAr: "الأدلة الإجرائية لنظام الإثبات", courts: ["general", "commercial", "personal_status", "labor", "criminal"], trustGatewayDate: false, citeable: true }],
    ["bankruptcy-reg.json", { key: "bankruptcy-regulation", nameAr: "اللائحة التنفيذية لنظام الإفلاس", courts: ["commercial"], trustGatewayDate: false, citeable: true }],
  ];
  for (const [file, law] of specs) {
    const model = JSON.parse(await readFile(path.join(cache, file), "utf8")).model;
    const record = lawFromGateway(model, law);
    await writeLaw(record);
    console.log(record.key, record.articles.length, record.effectiveDateStatus, record.gatewayValidFrom || "-");
  }
  const rentalHtml = await readFile(path.join(cache, "rega.html"), "utf8");
  const clauses = rentalClauses(rentalHtml);
  await writeLaw({
    key: "rental-provisions",
    nameAr: "الأحكام النظامية الخاصة بضبط العلاقة بين المؤجر والمستأجر",
    nameEn: "الأحكام النظامية الخاصة بضبط العلاقة بين المؤجر والمستأجر",
    sourceUrl: clauses[0].sourceUrl,
    version: "المرسوم الملكي رقم (م/73) وتاريخ 1447/04/02هـ",
    effectiveDate: null,
    effectiveDateStatus: "unverified",
    gatewayValidFrom: "",
    issuedHijri: "1447-04-02",
    publishedHijri: "1447-04-04",
    statusLabel: "ساري",
    isSample: false,
    citeable: true,
    numbering: "band",
    courts: ["general"],
    fetchedAt: new Date().toISOString(),
    articles: clauses,
  });
  console.log("rental-provisions", clauses.length);
  const civil = JSON.parse(await readFile(path.join(boeDir, "civil-transactions.json"), "utf8"));
  const article = civil.articles.find((item) => item.number === "المادة العشرون بعد السبعمائة");
  if (!article) throw new Error("article 720 was not found");
  const split = splitMaxims(article.textAr);
  const sourceUrl = article.sourceUrl;
  const maxims = {
    key: "civil-maxims",
    nameAr: "القواعد الكلية في المادة العشرون بعد السبعمائة من نظام المعاملات المدنية",
    sourceUrl,
    parentArticle: article.number,
    parentLaw: "civil-transactions",
    isSample: false,
    fetchedAt: new Date().toISOString(),
    preamble: split.preamble,
    rules: split.rules.map((rule) => ({ ...rule, sourceUrl, parentArticle: article.number })),
  };
  await writeFile(path.join(root, "corpus", "official", "maxims", "civil-720.json"), JSON.stringify(maxims));
  console.log("maxims", split.rules.length);
}

if (process.argv[1] && process.argv[1].endsWith("build-additions.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
