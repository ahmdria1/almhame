import { AppConfig } from "../config";

export interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

export class HttpSmsProvider implements SmsProvider {
  constructor(private readonly config: AppConfig) {}

  async send(to: string, body: string): Promise<void> {
    if (!this.config.smsBaseUrl || !this.config.smsApiKey) {
      throw new Error("SMS provider is not configured");
    }
    const response = await fetch(this.config.smsBaseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.smsApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, body, sender: this.config.smsSender }),
    });
    if (!response.ok) throw new Error("SMS provider rejected the message");
  }
}

export function smsProviderFor(config: AppConfig): SmsProvider | null {
  if (config.nodeEnv === "production" && config.smsProvider === "mock") return null;
  if (config.smsProvider === "http" && config.smsBaseUrl && config.smsApiKey) return new HttpSmsProvider(config);
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
