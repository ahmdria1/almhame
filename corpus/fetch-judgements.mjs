import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { htmlToText } from "./fetch-official.mjs";

export const MIN_INTERVAL_MS = 12000;
export const PAGE_SIZE = 12;
const GATEWAY = "https://laws-gateway.moj.gov.sa/apis/legislations/v1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "corpus", "official", "judgements");
const statePath = path.join(outDir, "state.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function request(url, init) {
  let lastError = new Error("gateway request failed");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await sleep(attempt === 0 ? MIN_INTERVAL_MS : 60000);
    const response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", "User-Agent": "elawyer-corpus", ...(init?.headers || {}) },
      signal: AbortSignal.timeout(90000),
    });
    const text = await response.text();
    if (response.ok && !text.startsWith("<")) return text;
    lastError = new Error(`${response.status} ${text.slice(0, 180)}`);
  }
  throw lastError;
}

export function derivedStatutes(text) {
  const cited = [];
  for (const match of text.matchAll(/المادة\s*\(([^)]+)\)/g)) {
    cited.push({ lawKey: "", article: match[1].trim(), derived: true });
  }
  return cited;
}

export function courtTypeName(lookups, code) {
  const rows = lookups?.courtType || [];
  const row = rows.find((item) => Number(item.value) === Number(code));
  return row?.name ? String(row.name).trim() : "";
}

function narrationText(list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  const lines = [];
  for (const item of list) {
    if (typeof item === "string" && item.trim()) lines.push(item.trim());
    else if (item && typeof item === "object") lines.push(JSON.stringify(item));
  }
  return lines.join("\n");
}

function publishedNumber(model, listNumber) {
  for (const value of [model.judgmentNumber, model.appealNumber, listNumber]) {
    const text = String(value || "").trim();
    if (/^\d{4,}$/.test(text)) return text;
  }
  return "";
}

export function normalizeJudgement(rawText, fetchedAt, extra = {}) {
  const data = JSON.parse(rawText);
  const model = data.model || {};
  const rawHtml = [model.judgmentTextofRulling, model.appealTextofRulling].filter(Boolean).join("\n");
  const fullText = htmlToText(rawHtml);
  const judgmentNo = publishedNumber(model, extra.listNumber);
  if (!judgmentNo) throw new Error("detail had no judgment number");
  const sourceUrl = `${GATEWAY}/Judgements/get-details?id=${encodeURIComponent(model.id || "")}`;
  const principleText = narrationText(model.judgmentNarrationList);
  if (!fullText) {
    return {
      source: "moj-portal",
      sourceRecordId: String(model.id || judgmentNo),
      judgmentNo,
      fullText: "",
      subject: extra.subject || "",
      verbatimStatus: "blocked",
      blockedReason: "The detail response had no judgment text.",
      isSample: false,
      sourceUrl,
      fetchedAt,
      sha256: hashText(rawText),
    };
  }
  const gregorianRaw = String(model.judgmentDate || model.appealDate || "").slice(0, 10);
  const gregorian = /^\d{4}-\d{2}-\d{2}$/.test(gregorianRaw) && Number(gregorianRaw.slice(0, 4)) >= 1900 ? gregorianRaw : "";
  return {
    source: "moj-portal",
    sourceRecordId: String(model.id || judgmentNo),
    court: model.judgmentCourtName || model.appealCourtName || "",
    courtType: model.judgmentCourtType || "",
    circuit: "",
    city: model.judgmentCityName || model.appealCityName || "",
    caseNo: String(model.title || "").match(/القضية رقم\s+(\S+)/)?.[1] || "",
    judgmentNo,
    appealNo: model.appealNumber || "",
    judgmentDateHijri: model.judgmentHijriiDate || model.appealHijriiDate || "",
    judgmentDateGregorian: gregorian,
    appealDateHijri: model.appealHijriiDate || "",
    isAppeal: Boolean(model.hasAppeal),
    title: model.title || "",
    facts: htmlToText(model.judgmentFacts || ""),
    reasons: htmlToText(model.judgmentReasons || ""),
    ruling: htmlToText(model.judgmentRuling || ""),
    fullText,
    rawHtml,
    subject: extra.subject || "",
    principleNo: "",
    principleText,
    statutesCited: derivedStatutes(fullText),
    sourceUrl,
    fetchedAt,
    sha256: hashText(rawText),
    isSample: false,
    verbatimStatus: "ok",
    blockedReason: "",
  };
}

async function loadState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return { listPage: 1, pageSize: PAGE_SIZE, judgmentNos: [], blocked: [] };
  }
}

async function patchSubject(judgmentNo, subject) {
  if (!subject) return;
  const file = path.join(outDir, `${judgmentNo}.json`);
  const raw = await readFile(file, "utf8").catch(() => "");
  if (!raw) return;
  const record = JSON.parse(raw);
  if (record.subject) return;
  record.subject = subject;
  await writeFile(file, JSON.stringify(record));
}

async function main() {
  const limit = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || "3");
  await mkdir(outDir, { recursive: true });
  const state = await loadState();
  if (state.pageSize !== PAGE_SIZE) state.listPage = 1;
  state.pageSize = PAGE_SIZE;
  state.blocked = state.blocked || [];
  const seen = new Set(state.judgmentNos || []);
  const blocked = new Set(state.blocked.map((row) => row.judgmentNo));
  let added = 0;
  let page = state.listPage || 1;
  const lookupText = await request(`${GATEWAY}/gatewaylookups/get?catalog=8&languageCode=ar`);
  const lookups = JSON.parse(lookupText).model || {};
  state.courtTypes = (lookups.courtType || []).map((row) => ({ value: row.value, name: String(row.name || "").trim() }));
  while (added < limit) {
    const listText = await request(`${GATEWAY}/Judgements/judgements-list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageNumber: page, pageSize: PAGE_SIZE }),
    });
    const list = JSON.parse(listText);
    const rows = list.model?.judgementsCollection || [];
    if (!rows.length) break;
    for (const row of rows) {
      const listNumber = String(row.judgementNumber || "").trim();
      const subject = courtTypeName(lookups, row.courtType);
      if (listNumber && (blocked.has(listNumber) || seen.has(listNumber))) {
        if (seen.has(listNumber)) await patchSubject(listNumber, subject);
        continue;
      }
      if (!listNumber && !row.id) continue;
      if (row.refereeNo) state.refereeSeen = (state.refereeSeen || 0) + 1;
      const detailText = await request(`${GATEWAY}/Judgements/get-details?id=${encodeURIComponent(row.id)}`);
      let record;
      try {
        record = normalizeJudgement(detailText, new Date().toISOString(), { subject, listNumber });
      } catch (error) {
        const label = listNumber || String(row.id || "");
        blocked.add(label);
        state.blocked.push({ judgmentNo: label, reason: error instanceof Error ? error.message : String(error), at: new Date().toISOString() });
        console.log("blocked", label, error instanceof Error ? error.message : error);
        continue;
      }
      if (record.verbatimStatus !== "ok") {
        blocked.add(record.judgmentNo);
        if (listNumber) blocked.add(listNumber);
        state.blocked.push({ judgmentNo: record.judgmentNo, reason: record.blockedReason, at: record.fetchedAt });
        console.log("blocked", record.judgmentNo, record.blockedReason);
        continue;
      }
      await writeFile(path.join(outDir, `${record.judgmentNo}.json`), JSON.stringify(record));
      seen.add(record.judgmentNo);
      if (listNumber) seen.add(listNumber);
      added += 1;
      console.log("stored", record.judgmentNo, record.court, record.city, record.subject);
      if (added >= limit) break;
    }
    page += 1;
    state.listPage = page;
    state.judgmentNos = [...seen];
    state.totalCount = list.model?.totalCount || state.totalCount || 0;
    state.addedThisRun = added;
    await writeFile(statePath, JSON.stringify(state, null, 2));
    if (rows.length < PAGE_SIZE) break;
  }
  state.judgmentNos = [...seen];
  state.addedThisRun = added;
  await writeFile(statePath, JSON.stringify(state, null, 2));
  console.log(JSON.stringify({ added, stored: seen.size, blocked: state.blocked.length, listPage: state.listPage, totalCount: state.totalCount || null }));
}

if (process.argv[1] && process.argv[1].endsWith("fetch-judgements.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
