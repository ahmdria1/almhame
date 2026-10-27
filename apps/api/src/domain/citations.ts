export interface CitationRef {
  kind: "article" | "sharia";
  id: string;
  number?: string;
}

const ARTICLE_RE = /(?:المادة|مادة)\s*\(?\s*(\d+)\s*\)?/g;
const TOKEN_RE = /\{\{cite:(article|sharia):([A-Za-z0-9_-]+)\}\}/g;

export function extractArticleNumbers(text: string): string[] {
  return [...text.matchAll(ARTICLE_RE)].map((match) => match[1]);
}

export function validateCitations(
  text: string,
  citations: CitationRef[],
  known: { articles: Map<string, { number: string }>; sharia: Set<string> },
): { ok: boolean; unknown: string[] } {
  const unknown: string[] = [];
  for (const citation of citations) {
    if (citation.kind === "article") {
      const row = known.articles.get(citation.id);
      if (!row) unknown.push(citation.id);
      else if (citation.number && row.number !== citation.number) unknown.push(`mismatch:${citation.id}`);
    } else if (!known.sharia.has(citation.id)) {
      unknown.push(citation.id);
    }
  }
  const allowedNumbers = new Set<string>();
  for (const citation of citations) {
    if (citation.kind !== "article") continue;
    const row = known.articles.get(citation.id);
    if (row) allowedNumbers.add(row.number);
  }
  for (const number of extractArticleNumbers(text)) {
    if (!allowedNumbers.has(number)) unknown.push(`article:${number}`);
  }
  for (const match of text.matchAll(TOKEN_RE)) {
    const kind = match[1] as "article" | "sharia";
    const id = match[2];
    const linked = citations.some((item) => item.kind === kind && item.id === id);
    const exists = kind === "article" ? known.articles.has(id) : known.sharia.has(id);
    if (!linked || !exists) unknown.push(`token:${id}`);
  }
  return { ok: unknown.length === 0, unknown };
}
