import { createHash } from "crypto";

export const EMBED_DIM = 384;

export function mockEmbed(text: string): number[] {
  const vec = new Array<number>(EMBED_DIM).fill(0);
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1);
  const grams = tokens.length > 0 ? tokens : [text];
  for (const token of grams) {
    const hash = createHash("sha256").update(token).digest();
    for (let i = 0; i < hash.length; i += 1) {
      const idx = (hash[i] + i * 13) % EMBED_DIM;
      const sign = hash[i] % 2 === 0 ? 1 : -1;
      vec[idx] += sign * (1 + (hash[(i + 5) % hash.length] % 4));
    }
  }
  const compact = text.replace(/\s+/g, "");
  for (let i = 0; i < Math.max(0, compact.length - 2); i += 1) {
    const hash = createHash("sha256").update(compact.slice(i, i + 3)).digest();
    vec[hash[0] % EMBED_DIM] += 0.35;
  }
  const norm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vec.map((value) => value / norm);
}

export function vectorLiteral(values: number[]): string {
  if (values.length !== EMBED_DIM) throw new Error("embedding dimension mismatch");
  return `[${values.map((value) => Number(value.toFixed(6))).join(",")}]`;
}
