import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { htmlToText } from "./fetch-official.mjs";

export const MIN_INTERVAL_MS = 12000;
const GATEWAY = "https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "corpus", "official", "judgements");
const statePath = path.join(outDir, "state.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url, init) {
  await sleep(MIN_INTERVAL_MS);
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", "User-Agent": "elawyer-corpus", ...(init?.headers || {}) },
    signal: AbortSignal.timeout(90000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 180)}`);
  return text;
}

export function derivedStatutes(text) {
  const cited = [];
  for (const match of text.matchAll(/المادة\s*\(([^)]+)\)/g)) {
    cited.push({ lawKey: "", article: match[1].trim(), derived: true });
  }
  return cited;
}

export function normalizeJudgement(rawText, fetchedAt) {
  const data = JSON.parse(rawText);
  const model = data.model || {};
  const rawHtml = [model.judgmentTextofRulling, model.appealTextofRulling].filter(Boolean).join("\n");
  const fullText = htmlToText(rawHtml);
  const judgmentNo = String(model.judgmentNumber || model.id || "").trim();
  if (!judgmentNo) throw new Error("detail had no judgment number");
  if (!fullText) {
    return {
      source: "moj-portal",
      sourceRecordId: String(model.id || judgmentNo),
      judgmentNo,
      fullText: "",
      verbatimStatus: "blocked",
      blockedReason: "The detail response had no judgment text.",
      isSample: false,
      sourceUrl: `https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements/get-details?id=${encodeURIComponent(model.id || "")}`,
      fetchedAt,
      sha256: createHash("sha256").update(rawText).digest("hex"),
    };
  }
  const gregorian = String(model.judgmentDate || "").slice(0, 10);
  return {
    source: "moj-portal",
    sourceRecordId: String(model.id || judgmentNo),
    court: model.judgmentCourtName || "",
    courtType: model.judgmentCourtType || "",
    circuit: "",
    city: model.judgmentCityName || "",
    caseNo: String(model.title || "").match(/القضية رقم\s+(\S+)/)?.[1] || "",
    judgmentNo,
    appealNo: model.appealNumber || "",
    judgmentDateHijri: model.judgmentHijriiDate || "",
    judgmentDateGregorian: /^\d{4}-\d{2}-\d{2}$/.test(gregorian) && Number(gregorian.slice(0, 4)) < 1900 ? "" : gregorian,
    appealDateHijri: model.appealHijriiDate || "",
    isAppeal: Boolean(model.hasAppeal),
    title: model.title || "",
    facts: htmlToText(model.judgmentFacts || ""),
    reasons: htmlToText(model.judgmentReasons || ""),
    ruling: htmlToText(model.judgmentRuling || ""),
    fullText,
    rawHtml,
    principleNo: "",
    principleText: "",
    statutesCited: derivedStatutes(fullText),
    sourceUrl: `https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements/get-details?id=${encodeURIComponent(model.id)}`,
    fetchedAt,
    sha256: createHash("sha256").update(rawText).digest("hex"),
    isSample: false,
    verbatimStatus: "ok",
    blockedReason: "",
  };
}

async function loadState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return { nextPage: 1, judgmentNos: [] };
  }
}

async function main() {
  const limit = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || "3");
  await mkdir(outDir, { recursive: true });
  await mkdir(path.dirname(statePath), { recursive: true });
  const state = await loadState();
  const seen = new Set(state.judgmentNos || []);
  let stored = seen.size;
  let page = state.nextPage || 1;
  while (stored < limit) {
    const listText = await request(`${GATEWAY}/judgements-list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageNumber: page, pageSize: 1 }),
    });
    const list = JSON.parse(listText);
    const rows = list.model?.judgementsCollection || [];
    if (!rows.length) break;
    for (const row of rows) {
      if (seen.has(String(row.judgementNumber))) continue;
      const detailText = await request(`${GATEWAY}/get-details?id=${encodeURIComponent(row.id)}`);
      const record = normalizeJudgement(detailText, new Date().toISOString());
      seen.add(record.judgmentNo);
      if (record.verbatimStatus !== "ok") {
        console.log("blocked", record.judgmentNo, record.blockedReason);
        continue;
      }
      await writeFile(path.join(outDir, `${record.judgmentNo}.json`), JSON.stringify(record));
      stored += 1;
      console.log("stored", record.judgmentNo, record.court, record.city);
      if (stored >= limit) break;
    }
    page += 1;
    state.nextPage = page;
    state.judgmentNos = [...seen];
    state.totalCount = list.model?.totalCount || state.totalCount || 0;
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }
  console.log(JSON.stringify({ stored, nextPage: state.nextPage, totalCount: state.totalCount || null }));
}

if (process.argv[1] && process.argv[1].endsWith("fetch-judgements.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
