export function socketOriginAllowed(origin: string | undefined, allowed: readonly string[]): boolean {
  if (!origin) return true;
  return allowed.includes(origin);
}
