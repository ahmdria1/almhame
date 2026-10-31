export function turnsAllowed(used: number, limit: number): boolean {
  if (limit <= 0) return true;
  return used < limit;
}

export function pagesAllowed(used: number, incoming: number, limit: number): boolean {
  if (limit <= 0) return true;
  return used + incoming <= limit;
}

export function withinDailyCap(count: number, limit: number): boolean {
  if (limit <= 0) return true;
  return count < limit;
}
