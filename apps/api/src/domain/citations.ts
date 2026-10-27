import { createHash } from "crypto";
import { citationLabel } from "./article-numbers";

export interface CitationRef {
  kind: "article" | "sharia";
  id: string;
  number?: string;
}

export interface KnownArticle {
  number: string;
  label: string;
  lawName: string;
  textHash: string;
}

export interface KnownSharia {
  textHash: string;
  reference: string;
}

const TOKEN_RE = /\{\{cite:(article|sharia):([A-Za-z0-9_-]+):([a-f0-9]{64})\}\}/g;
const MENTION_RE = /المادة\s*\(((?:[^()]|\([^()]*\))*)\)\s*من\s+([^\n:]+?)\s*:/g;
const BARE_RE = /المادة\s*\(((?:[^()]|\([^()]*\))*)\)/g;

export function normalizeCitationText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function textHash(value: string): string {
  return createHash("sha256").update(normalizeCitationText(value), "utf8").digest("hex");
}

export function knownArticle(number: string, lawName: string, text: string): KnownArticle {
  return { number, label: citationLabel(number), lawName: lawName.trim(), textHash: textHash(text) };
}

function lawNameOf(value: string): string {
  return normalizeCitationText(value).replace(/\s*\[عيّنة غير رسمية\]\s*$/g, "").trim();
}

function quotedAfter(text: string, tokenIndex: number, row: KnownArticle): string | null {
  const needle = `المادة (${row.label}) من ${row.lawName}`;
  const at = text.lastIndexOf(needle, tokenIndex);
  if (at < 0 || at >= tokenIndex) return null;
  let rest = text.slice(at + needle.length, tokenIndex).replace(/\s+$/g, "");
  rest = rest.replace(/^\s*\[عيّنة غير رسمية\]/, "");
  if (!rest.startsWith(":")) return null;
  return rest.replace(/^:\s*/, "").replace(/\s+$/g, "");
}

export function validateCitations(
  text: string,
  citations: CitationRef[],
  known: { articles: Map<string, KnownArticle>; sharia: Map<string, KnownSharia> },
): { ok: boolean; unknown: string[] } {
  const unknown: string[] = [];
  const citedArticles: KnownArticle[] = [];
  for (const citation of citations) {
    if (citation.kind === "article") {
      const row = known.articles.get(citation.id);
      if (!row) unknown.push(citation.id);
      else {
        citedArticles.push(row);
        if (citation.number && citation.number !== row.number && citation.number !== row.label) unknown.push(`mismatch:${citation.id}`);
      }
    } else {
      const row = known.sharia.get(citation.id);
      if (!row) unknown.push(citation.id);
    }
  }
  const seen = new Set<string>();
  let prose = text;
  for (const match of text.matchAll(TOKEN_RE)) {
    if (match[1] !== "article") continue;
    const row = known.articles.get(match[2]);
    if (!row || row.textHash !== match[3]) continue;
    const quote = quotedAfter(text, match.index ?? 0, row);
    if (quote) prose = prose.replace(quote, " ");
  }
  for (const match of text.matchAll(TOKEN_RE)) {
    const kind = match[1] as "article" | "sharia";
    const id = match[2];
    const hash = match[3];
    const linked = citations.some((item) => item.kind === kind && item.id === id);
    if (!linked) unknown.push(`token:${id}`);
    if (kind === "article") {
      const row = known.articles.get(id);
      if (!row) unknown.push(`token:${id}`);
      else if (row.textHash !== hash) unknown.push(`hash:${id}`);
      else {
        const quote = quotedAfter(text, match.index ?? 0, row);
        if (quote == null || textHash(quote) !== hash) unknown.push(`text:${id}`);
      }
    } else {
      const row = known.sharia.get(id);
      if (!row) unknown.push(`token:${id}`);
      else if (row.textHash !== hash) unknown.push(`hash:${id}`);
      else if (!text.slice(0, match.index ?? 0).replace(/\s*\[عيّنة فهرس\]/g, "").includes(`${row.reference}:`)) unknown.push(`reference:${id}`);
    }
    seen.add(`${kind}:${id}`);
  }
  for (const citation of citations) {
    if (!seen.has(`${citation.kind}:${citation.id}`)) unknown.push(`missing-token:${citation.id}`);
  }
  for (const match of prose.matchAll(MENTION_RE)) {
    const label = normalizeCitationText(match[1] || "");
    const lawName = lawNameOf(match[2] || "");
    const exact = citedArticles.filter((row) => row.label === label && row.lawName.trim() === lawName);
    if (exact.length > 0) continue;
    if (citedArticles.some((row) => row.label === label)) unknown.push(`statute:${label}`);
    else unknown.push(`article:${label}`);
  }
  for (const match of prose.matchAll(BARE_RE)) {
    const label = normalizeCitationText(match[1] || "");
    if (!citedArticles.some((row) => row.label === label)) unknown.push(`article:${label}`);
  }
  return { ok: unknown.length === 0, unknown: [...new Set(unknown)] };
}
