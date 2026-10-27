import { createCipheriv, createDecipheriv, createHmac, timingSafeEqual } from "crypto";

const TRANPORTAL_IV = Buffer.from("PGKEYENCDECIVSPC");

export function encryptTrandata(json: string, resourceKey: string): string {
  const key = Buffer.from(resourceKey, "utf8");
  if (key.length !== 16 && key.length !== 32) {
    throw new Error("Al Rajhi resource key must be 16 or 32 bytes");
  }
  const algo = key.length === 16 ? "aes-128-cbc" : "aes-256-cbc";
  const cipher = createCipheriv(algo, key, TRANPORTAL_IV);
  return Buffer.concat([cipher.update(json, "utf8"), cipher.final()]).toString("hex");
}

export function decryptTrandata(hex: string, resourceKey: string): string {
  const key = Buffer.from(resourceKey, "utf8");
  const algo = key.length === 16 ? "aes-128-cbc" : "aes-256-cbc";
  const decipher = createDecipheriv(algo, key, TRANPORTAL_IV);
  return Buffer.concat([decipher.update(Buffer.from(hex, "hex")), decipher.final()]).toString("utf8");
}

export function buildTrandata(input: {
  tranportalId: string;
  password: string;
  amountSar: string;
  trackId: string;
  responseUrl: string;
  errorUrl: string;
  lang?: string;
}): string {
  return JSON.stringify([
    {
      id: input.tranportalId,
      password: input.password,
      action: "1",
      currencyCode: "682",
      amt: input.amountSar,
      trackId: input.trackId,
      responseURL: input.responseUrl,
      errorURL: input.errorUrl,
      langid: input.lang ?? "ar",
    },
  ]);
}

export function signSandbox(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function sandboxSignatureOk(secret: string, payload: string, signature: string): boolean {
  const actual = Buffer.from(signSandbox(secret, payload));
  const expected = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
