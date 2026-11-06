export type MemoRow = {
  id: string;
  title: string;
  court: string;
  memoType: string;
  updatedAt: string;
  status?: string;
};

export type MemoQuery = {
  q?: string;
  court?: string;
  memoType?: string;
  from?: string;
  to?: string;
  searchIds?: string[] | null;
};

export type RecentMemo = { id: string; title: string; openedAt: string };

const RECENT_KEY = "elw-recent-memos";

export function filterMemos(rows: MemoRow[], query: MemoQuery): MemoRow[] {
  const q = (query.q || "").trim().toLocaleLowerCase();
  const from = query.from ? Date.parse(`${query.from}T00:00:00`) : Number.NaN;
  const to = query.to ? Date.parse(`${query.to}T23:59:59.999`) : Number.NaN;
  const ids = query.searchIds ? new Set(query.searchIds) : null;
  return rows.filter((row) => {
    if (query.court && row.court !== query.court) return false;
    if (query.memoType && row.memoType !== query.memoType) return false;
    const at = Date.parse(row.updatedAt);
    if (!Number.isNaN(from) && at < from) return false;
    if (!Number.isNaN(to) && at > to) return false;
    if (!q) return true;
    const inTitle = row.title.toLocaleLowerCase().includes(q);
    const inSearch = ids ? ids.has(row.id) : false;
    return inTitle || inSearch;
  });
}

export function sortMemos(rows: MemoRow[], direction: "newest" | "oldest"): MemoRow[] {
  return [...rows].sort((a, b) => {
    const delta = Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
    return direction === "oldest" ? delta : -delta;
  });
}

type Store = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function readRecent(store: Store): RecentMemo[] {
  try {
    const parsed = JSON.parse(store.getItem(RECENT_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentMemo => {
        if (!item || typeof item !== "object") return false;
        const row = item as RecentMemo;
        return typeof row.id === "string" && typeof row.title === "string" && typeof row.openedAt === "string";
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function rememberMemo(store: Store, memo: { id: string; title: string }, openedAt: string): RecentMemo[] {
  const next = [{ id: memo.id, title: memo.title, openedAt }, ...readRecent(store).filter((item) => item.id !== memo.id)].slice(0, 8);
  store.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

export function missingPieces(input: { docs: number; messages: number; plaintiff: string; defendant: string }): Array<"documents" | "facts" | "plaintiff" | "defendant"> {
  const missing: Array<"documents" | "facts" | "plaintiff" | "defendant"> = [];
  if (input.docs < 1) missing.push("documents");
  if (input.messages < 2) missing.push("facts");
  if (!input.plaintiff.trim()) missing.push("plaintiff");
  if (!input.defendant.trim()) missing.push("defendant");
  return missing;
}

export function wordCount(body: string): number {
  const trimmed = body.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
