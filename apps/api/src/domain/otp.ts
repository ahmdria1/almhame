import { createHmac, randomInt, timingSafeEqual } from "crypto";

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: string, pepper: string): string {
  return createHmac("sha256", pepper).update(code).digest("hex");
}

export function otpMatches(code: string, hash: string, pepper: string): boolean {
  const actual = createHmac("sha256", pepper).update(code).digest();
  const expected = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export function normalizePhone(input: string): string {
  const compact = input.replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("05") && compact.length === 10) return `+966${compact.slice(1)}`;
  if (compact.startsWith("5") && compact.length === 9) return `+966${compact}`;
  if (compact.startsWith("966")) return `+${compact}`;
  return `+${compact}`;
}

export function isPhone(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
