import { AppConfig } from "../config";

export const TAQNYAT_BASE = "https://api.taqnyat.sa";

export interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

export function taqnyatRecipient(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `966${digits.slice(1)}`;
  return digits;
}

export function smsSenderAccepted(provider: string, apiKey: string, sender: string, baseUrl: string): boolean {
  const name = sender.trim();
  if (provider !== "taqnyat" || !apiKey || !name || /^(test|mock|disabled|sandbox)$/i.test(name)) return false;
  return (baseUrl || TAQNYAT_BASE).startsWith(TAQNYAT_BASE);
}

export class TaqnyatSmsProvider implements SmsProvider {
  constructor(
    private readonly config: AppConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(to: string, body: string): Promise<void> {
    if (!smsSenderAccepted(this.config.smsProvider, this.config.smsApiKey, this.config.smsSender, this.config.smsBaseUrl || TAQNYAT_BASE)) {
      throw new Error("SMS provider is not configured");
    }
    const base = (this.config.smsBaseUrl || TAQNYAT_BASE).replace(/\/$/, "");
    const url = base.endsWith("/v1/messages") ? base : `${base}/v1/messages`;
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
