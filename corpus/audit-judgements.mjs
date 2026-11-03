import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MIN_INTERVAL_MS, hashText } from "./fetch-judgements.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "corpus", "official", "judgements");
const GATEWAY_HOST = "laws-gateway.moj.gov.sa";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function localDefects(name, record) {
  const defects = [];
  const judgmentNo = name.replace(/\.json$/, "");
  if (record.judgmentNo !== judgmentNo) defects.push("filename does not match judgment number");
  if (record.source !== "moj-portal") defects.push("source is not the ministry portal");
  if (record.isSample !== false) defects.push("record is marked as a sample");
  if (record.verbatimStatus !== "ok") defects.push(`verbatim status ${record.verbatimStatus}`);
  if (!record.fullText) defects.push("full text is empty");
  if (!record.sourceUrl || !record.sourceUrl.startsWith(`https://${GATEWAY_HOST}/`)) defects.push("source URL is not the ministry gateway");
  if (!/^[0-9a-f]{64}$/.test(record.sha256 || "")) defects.push("content hash is missing");
  if (!record.fetchedAt || Number.isNaN(Date.parse(record.fetchedAt))) defects.push("fetch date is missing");
  if (typeof record.court !== "string") defects.push("court is missing");
  if (typeof record.subject !== "string") defects.push("subject is missing");
  if (record.principleText == null) defects.push("principle text is missing");
  return defects;
}

async function refetch(url) {
  await sleep(MIN_INTERVAL_MS);
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "elawyer-corpus" },
    signal: AbortSignal.timeout(90000),
  });
  const text = await response.text();
  if (!response.ok || text.startsWith("<")) throw new Error(`${response.status} ${text.slice(0, 160)}`);
  return text;
}

async function main() {
  const names = (await readdir(dir)).filter((name) => /^\d+\.json$/.test(name)).sort();
  const defects = [];
  const records = [];
  for (const name of names) {
    const record = JSON.parse(await readFile(path.join(dir, name), "utf8"));
    records.push(record);
    for (const defect of localDefects(name, record)) defects.push(`${record.judgmentNo || name}: ${defect}`);
  }
  const sampleSize = Number(process.env.JUDGEMENT_AUDIT_SAMPLE || "2");
  const sample = records.slice(0, Math.min(sampleSize, records.length));
  const checked = [];
  let unreachable = 0;
  for (const record of sample) {
    try {
      const text = await refetch(record.sourceUrl);
      const hash = hashText(text);
      const data = JSON.parse(text);
      const number = String(data.model?.judgmentNumber || "");
      if (hash !== record.sha256) defects.push(`${record.judgmentNo}: stored hash does not match the source`);
      if (number && number !== record.judgmentNo) defects.push(`${record.judgmentNo}: source number is ${number}`);
      checked.push({ judgmentNo: record.judgmentNo, hash, match: hash === record.sha256 });
    } catch (error) {
      unreachable += 1;
      console.log(`unreachable ${record.judgmentNo}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`judgments ${records.length}`);
  console.log(`source sample ${checked.length} unreachable ${unreachable}`);
  for (const row of checked) console.log(`${row.judgmentNo} ${row.match ? "match" : "DIFF"}`);
  if (sample.length > 0 && checked.length === 0) defects.push("the source sample could not be fetched");
  if (defects.length) {
    console.log(`FAILED ${defects.length}`);
    for (const item of defects) console.log(`- ${item}`);
    process.exit(1);
  }
  console.log("OK");
}

if (process.argv[1] && process.argv[1].endsWith("audit-judgements.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
