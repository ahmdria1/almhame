import { createHmac } from "crypto";

export function searchWords(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
  return [...new Set(words)].slice(0, 24);
}

export function blindToken(dek: Buffer, word: string): string {
  return createHmac("sha256", dek).update(searchWords(word)[0] || word).digest("hex");
}

export function blindTokens(dek: Buffer, text: string): string[] {
  return searchWords(text).map((word) => createHmac("sha256", dek).update(word).digest("hex"));
}
