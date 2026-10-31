export const TAQNYAT_BASE = "https://api.taqnyat.sa";

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

export async function sendSms(
  input: {
    provider: string;
    baseUrl: string;
    apiKey: string;
    sender: string;
    nodeEnv: string;
    fetchImpl?: typeof fetch;
  },
  message: { to: string; text: string },
): Promise<void> {
  if (input.nodeEnv === "test" || input.provider === "mock") return;
  if (!smsSenderAccepted(input.provider, input.apiKey, input.sender, input.baseUrl || TAQNYAT_BASE)) {
    throw new Error("sms sender");
  }
  const caller = input.fetchImpl || fetch;
  const base = (input.baseUrl || TAQNYAT_BASE).replace(/\/$/, "");
  const url = base.endsWith("/v1/messages") ? base : `${base}/v1/messages`;
  const response = await caller(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipients: [taqnyatRecipient(message.to)],
      body: message.text,
      sender: input.sender.trim(),
    }),
  });
  if (response.status !== 201) throw new Error("sms failed");
}
