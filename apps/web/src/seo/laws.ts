import { createHash } from "crypto";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const LAW_DIR = join(__dirname, "../../../../corpus/official/boe");
const SKIP = new Set(["blocked.json", "manifest-report.json"]);

export type LawArticle = { number: string; textAr: string; sourceUrl?: string };

export type LawRecord = {
  key: string;
  nameAr: string;
  nameEn: string;
  sourceUrl: string;
  version: string;
  effectiveDate: string;
  isSample: boolean;
  articles: LawArticle[];
};

export type LawSummary = Omit<LawRecord, "articles">;

let cache: LawRecord[] | null = null;

export function normalizeCitationText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function textHash(value: string): string {
  return createHash("sha256").update(normalizeCitationText(value), "utf8").digest("hex");
}

function readLaw(file: string): LawRecord | null {
  const raw = JSON.parse(readFileSync(join(LAW_DIR, file), "utf8")) as LawRecord;
  if (!raw.key || !raw.nameAr || raw.isSample === true || !Array.isArray(raw.articles) || raw.articles.length === 0) return null;
  return raw;
}

export function listLaws(): LawSummary[] {
  return loadLaws().map(({ articles: _articles, ...summary }) => summary);
}

export function loadLaws(): LawRecord[] {
  if (cache) return cache;
  const files = readdirSync(LAW_DIR).filter((name) => name.endsWith(".json") && !SKIP.has(name)).sort();
  cache = files.map(readLaw).filter((law): law is LawRecord => law !== null).sort((a, b) => a.key.localeCompare(b.key));
  return cache;
}

export function lawByKey(key: string): LawRecord | null {
  return loadLaws().find((law) => law.key === key) ?? null;
}

export function articleByNumber(law: LawRecord, number: string): LawArticle | null {
  const wanted = number.trim();
  const matches = law.articles.filter((article) => article.number.trim() === wanted);
  return matches.length === 1 ? matches[0] : null;
}
