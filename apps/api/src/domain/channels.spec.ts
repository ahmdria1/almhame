import { nafathStatus, requestNafath } from "./nafath";
import { sendExpoPush } from "./push";
import { sendSms } from "./sms";

describe("production channels", () => {
  it("posts an SMS only when the provider is real", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await sendSms(
      { provider: "mock", baseUrl: "https://sms.example", apiKey: "k", sender: "EMU", nodeEnv: "development", fetchImpl: fetchImpl as unknown as typeof fetch },
      { to: "966500000000", text: "123456" },
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    await sendSms(
      { provider: "http", baseUrl: "https://sms.example/send", apiKey: "k", sender: "EMU", nodeEnv: "production", fetchImpl: fetchImpl as unknown as typeof fetch },
      { to: "966500000000", text: "123456" },
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    fetchImpl.mockResolvedValueOnce(new Response("no", { status: 500 }));
    await expect(
      sendSms(
        { provider: "http", baseUrl: "https://sms.example/send", apiKey: "k", sender: "EMU", nodeEnv: "production", fetchImpl: fetchImpl as unknown as typeof fetch },
        { to: "966500000000", text: "123456" },
      ),
    ).rejects.toThrow(/sms failed/);
  });

  it("posts an Expo notification with the access token", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await sendExpoPush({ accessToken: "tok", nodeEnv: "test", fetchImpl: fetchImpl as unknown as typeof fetch }, { to: "ExponentPushToken[x]", title: "a", body: "b", channelId: "notices-free-normal" });
    expect(fetchImpl).not.toHaveBeenCalled();
    await sendExpoPush({ accessToken: "tok", nodeEnv: "production", fetchImpl: fetchImpl as unknown as typeof fetch }, { to: "ExponentPushToken[x]", title: "a", body: "b", channelId: "notices-paid-urgent" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("exp.host");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("starts a Nafath request and reads its status", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ transId: "t1", random: "42" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 }));
    const caller = fetchImpl as unknown as typeof fetch;
    await expect(requestNafath({ baseUrl: "https://nafath.api.elm.sa", appId: "app", appKey: "key", service: "login", fetchImpl: caller }, "1098765432")).resolves.toEqual({ transId: "t1", random: "42" });
    await expect(nafathStatus({ baseUrl: "https://nafath.api.elm.sa/", appId: "app", appKey: "key", fetchImpl: caller }, { nationalId: "1098765432", transId: "t1", random: "42" })).resolves.toBe("COMPLETED");
    const headers = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers["APP-ID"]).toBe("app");
    expect(headers["APP-KEY"]).toBe("key");
  });
});
