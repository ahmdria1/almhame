import { JURISDICTION_CATALOG } from "@elawyer/types";
import { createCipheriv, createDecipheriv } from "crypto";

// Al Rajhi's hosted gateway kit fixes the AES-CBC IV to this value (PGKEYENCDECIVSPC).
// The bank rejects a random IV, so the constant stays in this adapter and nowhere else.
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

export const ALRAJHI_MERCHANT_URL = "https://securepayments.alrajhibank.com.sa/pg/payment/tranportal.htm";

export function buildFollowupTrandata(input: {
  tranportalId: string;
  password: string;
  action: "2" | "8";
  amountSar: string;
  currencyCode?: string;
  trackId: string;
  transId: string;
  responseUrl: string;
  errorUrl: string;
}): string {
  return JSON.stringify([
    {
      id: input.tranportalId,
      password: input.password,
      action: input.action,
      currencyCode: input.currencyCode ?? JURISDICTION_CATALOG.SA.numericCurrency,
      amt: input.amountSar,
      trackId: input.trackId,
      transId: input.transId,
      udf5: input.action === "8" ? "PaymentID" : "TrackID",
      responseURL: input.responseUrl,
      errorURL: input.errorUrl,
      langid: "ar",
    },
  ]);
}

export function merchantEnvelope(input: { tranportalId: string; trandata: string; responseUrl: string; errorUrl: string }): string {
  return JSON.stringify([
    {
      id: input.tranportalId,
      trandata: input.trandata,
      responseURL: input.responseUrl,
      errorURL: input.errorUrl,
    },
  ]);
}

export function readGatewayRow(payload: unknown): Record<string, string> {
  const row = Array.isArray(payload) ? payload[0] : payload;
  if (!row || typeof row !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    if (value !== undefined && value !== null) out[key] = String(value);
  }
  return out;
}

export function capturedAmount(row: Record<string, string>): { captured: boolean; amount: string } {
  const result = (row.result || "").toUpperCase();
  return { captured: result === "CAPTURED" || result === "SUCCESS" || result === "APPROVED", amount: row.amt || "" };
}

export async function postTranportal(input: {
  merchantUrl: string;
  tranportalId: string;
  resourceKey: string;
  plain: string;
  responseUrl: string;
  errorUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<Record<string, string>> {
  const caller = input.fetchImpl || fetch;
  const response = await caller(input.merchantUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: merchantEnvelope({
      tranportalId: input.tranportalId,
      trandata: encryptTrandata(input.plain, input.resourceKey),
      responseUrl: input.responseUrl,
      errorUrl: input.errorUrl,
    }),
  });
  if (!response.ok) throw new Error("alrajhi merchant");
  const outer = readGatewayRow(await response.json());
  if (outer.status && outer.status !== "1") throw new Error(outer.errorText || "alrajhi merchant");
  if (!outer.trandata) return outer;
  const inner = JSON.parse(decryptTrandata(decodeURIComponent(outer.trandata), input.resourceKey)) as unknown;
  return readGatewayRow(inner);
}

export function buildTrandata(input: {
  tranportalId: string;
  password: string;
  amountSar: string;
  currencyCode?: string;
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
      currencyCode: input.currencyCode ?? JURISDICTION_CATALOG.SA.numericCurrency,
      amt: input.amountSar,
      trackId: input.trackId,
      responseURL: input.responseUrl,
      errorURL: input.errorUrl,
      langid: input.lang ?? "ar",
    },
  ]);
}
