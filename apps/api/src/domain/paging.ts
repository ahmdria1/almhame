export function pageQuery(pageRaw?: string | number, takeRaw?: string | number) {
  const page = Math.max(1, Math.floor(Number(pageRaw) || 1));
  const requested = takeRaw === undefined || takeRaw === "" ? 20 : Number(takeRaw);
  const take = Math.min(50, Math.max(1, Math.floor(Number.isFinite(requested) ? requested : 20)));
  return { page, take, skip: (page - 1) * take };
}

export function pageMeta(total: number, page: number, take: number) {
  return { total, page, take, totalPages: Math.max(1, Math.ceil(total / take)) };
}
