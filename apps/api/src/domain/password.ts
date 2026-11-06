import bcrypt from "bcryptjs";

export const PASSWORD_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_COST);
}

export function hashCost(hash: string): number {
  const cost = Number(hash.split("$")[2]);
  return Number.isFinite(cost) ? cost : 0;
}

export async function passwordMatches(password: string, hash: string): Promise<{ ok: boolean; rehash: boolean }> {
  const ok = await bcrypt.compare(password, hash);
  return { ok, rehash: ok && hashCost(hash) < PASSWORD_COST };
}
