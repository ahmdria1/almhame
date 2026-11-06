import type { AppConfig } from "../config";

export const TAQNYAT_BASE = "https://api.taqnyat.sa";
const TAQNYAT_HOST = "api.taqnyat.sa";

export interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

export function taqnyatRecipient(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `966${digits.slice(1)}`;
  return digits;
}

export function officialTaqnyatUrl(baseUrl: string): URL | null {
  const raw = baseUrl.trim() || TAQNYAT_BASE;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== TAQNYAT_HOST || url.port !== "") return null;
  return url;
}

export function taqnyatMessagesUrl(baseUrl: string): string | null {
  const url = officialTaqnyatUrl(baseUrl);
  if (!url) return null;
  const path = url.pathname.replace(/\/+$/, "");
  const messages = path.endsWith("/v1/messages") ? path : `${path}/v1/messages`;
  return new URL(messages, url.origin).href;
}

export function smsSenderAccepted(provider: string, apiKey: string, sender: string, baseUrl: string): boolean {
  const name = sender.trim();
  if (provider !== "taqnyat" || !apiKey || !name || /^(test|mock|disabled|sandbox)$/i.test(name)) return false;
  return officialTaqnyatUrl(baseUrl) !== null;
}

export class TaqnyatSmsProvider implements SmsProvider {
  constructor(
    private readonly config: AppConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(to: string, body: string): Promise<void> {
    const url = taqnyatMessagesUrl(this.config.smsBaseUrl);
    if (!url || !smsSenderAccepted(this.config.smsProvider, this.config.smsApiKey, this.config.smsSender, this.config.smsBaseUrl)) {
      throw new Error("SMS provider is not configured");
    }
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.smsApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients: [taqnyatRecipient(to)],
        body,
        sender: this.config.smsSender.trim(),
      }),
    });
    if (response.status !== 201) throw new Error("SMS provider rejected the message");
  }
}

export function smsProviderFor(config: AppConfig): SmsProvider | null {
  if (config.nodeEnv === "test" || config.smsProvider === "mock") return null;
  if (config.smsProvider === "taqnyat") return new TaqnyatSmsProvider(config);
  return null;
}

export function verifierModel(draftModel: string, configured: string): string | null {
  const name = configured.trim();
  if (!name || name === draftModel) return null;
  return name;
}

export function officialTitle(html: string): string {
  const match = html.match(/<title>([^<]{1,180})<\/title>/i);
  return (match?.[1] || "").replace(/\s+/g, " ").trim();
}
