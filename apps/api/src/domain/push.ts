export async function sendExpoPush(
  input: { accessToken: string; nodeEnv: string; fetchImpl?: typeof fetch },
  message: { to: string; title: string; body: string; channelId: string },
): Promise<void> {
  if (input.nodeEnv === "test" || !message.to) return;
  const caller = input.fetchImpl || fetch;
  const response = await caller("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      to: message.to,
      title: message.title,
      body: message.body,
      channelId: message.channelId,
      sound: "default",
    }),
  });
  if (!response.ok) throw new Error("push failed");
}
