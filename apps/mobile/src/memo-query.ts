export type MemoRow = {
  id: string;
  title: string;
  court: string;
  memoType: string;
  updatedAt: string;
};

export function filterMemos(rows: MemoRow[], query: { q?: string; court?: string; memoType?: string }): MemoRow[] {
  const q = (query.q || "").trim().toLocaleLowerCase();
  return rows.filter((row) => {
    if (query.court && row.court !== query.court) return false;
    if (query.memoType && row.memoType !== query.memoType) return false;
    if (q && !row.title.toLocaleLowerCase().includes(q)) return false;
    return true;
  });
}
