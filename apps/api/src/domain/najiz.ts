import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { AppConfig } from "../config";

export interface CourtFilingNotice {
  externalId: string;
  title: string;
  filer: string;
  filedAt: string;
  responseDeadline: string | null;
}

export interface CaseSourceQuery {
  caseNumber: string;
  court: string;
}

export interface CaseSource {
  readonly connected: boolean;
  poll(input: CaseSourceQuery): Promise<CourtFilingNotice[]>;
  verifyCallback(payload: string, signature: string): boolean;
}

export function najizParts(config: Pick<AppConfig, "najizBaseUrl" | "najizClientId" | "najizClientSecret" | "najizCallbackSecret" | "najizTokenPath" | "najizCaseQueryPath">): string[] {
  return [config.najizBaseUrl, config.najizClientId, config.najizClientSecret, config.najizCallbackSecret, config.najizTokenPath, config.najizCaseQueryPath].map((value) => (value || "").trim());
}

export function najizConnected(config: Pick<AppConfig, "najizBaseUrl" | "najizClientId" | "najizClientSecret" | "najizCallbackSecret" | "najizTokenPath" | "najizCaseQueryPath">): boolean {
  const parts = najizParts(config);
  const path = (config.najizCaseQueryPath || "");
  return parts.every((value) => value.length > 0) && path.includes("{caseNumber}") && path.includes("{court}");
}

export function najizStatus(config: Pick<AppConfig, "najizBaseUrl" | "najizClientId" | "najizClientSecret" | "najizCallbackSecret" | "najizTokenPath" | "najizCaseQueryPath">): "connected" | "not connected" {
  return najizConnected(config) ? "connected" : "not connected";
}

export function caseKey(court: string, caseNumber: string): string {
  return createHash("sha256").update(`${court.trim()}\n${caseNumber.trim()}`, "utf8").digest("hex");
}

export function sourceHash(filing: CourtFilingNotice): string {
  return createHash("sha256").update(JSON.stringify({
    externalId: filing.externalId.trim(),
    filedAt: filing.filedAt.trim(),
    filer: filing.filer.trim(),
    responseDeadline: filing.responseDeadline,
    title: filing.title.trim(),
  }), "utf8").digest("hex");
}

export function canonicalFiling(input: {
  caseNumber: string;
  court: string;
  externalId: string;
  title: string;
  filer: string;
  filedAt: string;
  responseDeadline?: string | null;
}): string {
  return JSON.stringify({
    caseNumber: input.caseNumber.trim(),
    court: input.court.trim(),
    externalId: input.externalId.trim(),
    filedAt: input.filedAt.trim(),
    filer: input.filer.trim(),
    responseDeadline: input.responseDeadline ? input.responseDeadline.trim() : null,
    title: input.title.trim(),
  });
}

export function signCallback(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function signaturesMatch(expected: string, presented: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(presented);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isNewFiling(knownExternalIds: ReadonlySet<string>, externalId: string): boolean {
  return !knownExternalIds.has(externalId.trim());
}

export function parseFiling(row: unknown): CourtFilingNotice | null {
  if (!row || typeof row !== "object") return null;
  const item = row as Record<string, unknown>;
  const externalId = typeof item.externalId === "string" ? item.externalId.trim() : "";
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const filer = typeof item.filer === "string" ? item.filer.trim() : "";
  const filedAt = typeof item.filedAt === "string" ? item.filedAt.trim() : "";
  const deadline = typeof item.responseDeadline === "string" ? item.responseDeadline.trim() : "";
  if (!externalId || !title || !filer || !filedAt || Number.isNaN(Date.parse(filedAt))) return null;
  if (deadline && Number.isNaN(Date.parse(deadline))) return null;
  return { externalId, title, filer, filedAt, responseDeadline: deadline || null };
}

export function filingsFromPayload(payload: unknown): CourtFilingNotice[] {
  const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const rows = Array.isArray(body.filings) ? body.filings : [];
  const seen = new Set<string>();
  const filings: CourtFilingNotice[] = [];
  for (const row of rows) {
    const filing = parseFiling(row);
    if (!filing || seen.has(filing.externalId)) continue;
    seen.add(filing.externalId);
    filings.push(filing);
  }
  return filings;
}

export class NajizCaseSource implements CaseSource {
  constructor(private readonly config: AppConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  get connected(): boolean {
    return najizConnected(this.config);
  }

  verifyCallback(payload: string, signature: string): boolean {
    if (!this.connected) return false;
    return signaturesMatch(signCallback(this.config.najizCallbackSecret, payload), signature.trim());
  }

  async poll(input: CaseSourceQuery): Promise<CourtFilingNotice[]> {
    if (!this.connected) return [];
    const token = await this.token();
    const path = this.config.najizCaseQueryPath
      .replaceAll("{caseNumber}", encodeURIComponent(input.caseNumber))
      .replaceAll("{court}", encodeURIComponent(input.court));
    const url = new URL(path, this.config.najizBaseUrl);
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Najiz case query ${response.status}`);
    return filingsFromPayload(await response.json());
  }

  private async token(): Promise<string> {
    const url = new URL(this.config.najizTokenPath, this.config.najizBaseUrl);
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.config.najizClientId,
        client_secret: this.config.najizClientSecret,
      }),
    });
    if (!response.ok) throw new Error(`Najiz token ${response.status}`);
    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) throw new Error("Najiz token response had no access token");
    return data.access_token;
  }
}
