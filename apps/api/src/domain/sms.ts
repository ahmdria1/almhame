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
  const caller = input.fetchImpl || fetch;
  const response = await caller(input.baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: message.to, sender: input.sender, message: message.text }),
  });
  if (!response.ok) throw new Error("sms failed");
}
