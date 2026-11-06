import type { AppConfig } from "../config";
import { assertNoSandboxPaymentRoutes, collectExpressPaths, sandboxRoutesEnabled } from "./payments";
import { smsSenderAccepted, TaqnyatSmsProvider, taqnyatMessagesUrl, taqnyatRecipient } from "./sms-provider";
import { socketOriginAllowed } from "./origin";

describe("production payment and socket surface", () => {
  it("drops sandbox payment routes in production", () => {
    expect(sandboxRoutesEnabled("production")).toBe(false);
    expect(sandboxRoutesEnabled("test")).toBe(true);
    const paths = collectExpressPaths([
      { path: "/api", handle: { stack: [{ route: { path: "/payments/confirm" } }, { route: { path: "/payments/callback" } }] } },
    ]);
    expect(() => assertNoSandboxPaymentRoutes("production", paths)).toThrow(/sandbox payment routes/);
    expect(() => assertNoSandboxPaymentRoutes("production", ["/api/payments/callback"])).not.toThrow();
  });

  it("allows only listed browser origins", () => {
    const allowed = ["https://emuhami.com"];
    expect(socketOriginAllowed(undefined, allowed)).toBe(true);
    expect(socketOriginAllowed("https://emuhami.com", allowed)).toBe(true);
    expect(socketOriginAllowed("https://evil.example", allowed)).toBe(false);
  });

  it("accepts a Taqnyat sender and a Saudi mobile", () => {
    expect(smsSenderAccepted("taqnyat", "key", "EMU", "https://api.taqnyat.sa")).toBe(true);
    expect(smsSenderAccepted("taqnyat", "key", "EMU", "")).toBe(true);
    expect(smsSenderAccepted("taqnyat", "key", "EMU", "https://api.taqnyat.sa/v1/messages")).toBe(true);
    expect(smsSenderAccepted("mock", "key", "EMU", "https://api.taqnyat.sa")).toBe(false);
    expect(smsSenderAccepted("taqnyat", "key", "", "https://api.taqnyat.sa")).toBe(false);
    expect(smsSenderAccepted("taqnyat", "key", "mock", "https://api.taqnyat.sa")).toBe(false);
    expect(smsSenderAccepted("taqnyat", "key", "sandbox", "https://api.taqnyat.sa")).toBe(false);
    expect(smsSenderAccepted("taqnyat", "key", "EMU", "https://api.taqnyat.sa.evil.example")).toBe(false);
    expect(smsSenderAccepted("taqnyat", "key", "EMU", "http://api.taqnyat.sa")).toBe(false);
    expect(smsSenderAccepted("taqnyat", "key", "EMU", "https://evil.example/https://api.taqnyat.sa")).toBe(false);
    expect(smsSenderAccepted("taqnyat", "key", "EMU", "https://api.taqnyat.sa:8443")).toBe(false);
    expect(taqnyatMessagesUrl("https://api.taqnyat.sa")).toBe("https://api.taqnyat.sa/v1/messages");
    expect(taqnyatMessagesUrl("https://api.taqnyat.sa/v1/messages")).toBe("https://api.taqnyat.sa/v1/messages");
    expect(taqnyatMessagesUrl("https://user:secret@api.taqnyat.sa/v1/messages")).toBe("https://api.taqnyat.sa/v1/messages");
    expect(taqnyatMessagesUrl("https://api.taqnyat.sa.evil.example")).toBeNull();
    expect(taqnyatMessagesUrl("not a url")).toBeNull();
    expect(taqnyatRecipient("0551234567")).toBe("966551234567");
  });

  it("posts a message only to the official Taqnyat host", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init || {} });
      return new Response(null, { status: 201 });
    }) as typeof fetch;
    const provider = new TaqnyatSmsProvider({
      smsProvider: "taqnyat",
      smsApiKey: "sms-key",
      smsSender: "EMU",
      smsBaseUrl: "https://api.taqnyat.sa",
    } as AppConfig, fetchImpl);
    await provider.send("0551234567", "رمز الدخول");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.taqnyat.sa/v1/messages");
    expect(new Headers(calls[0].init.headers).get("authorization")).toBe("Bearer sms-key");
    const blocked = new TaqnyatSmsProvider({
      smsProvider: "taqnyat",
      smsApiKey: "sms-key",
      smsSender: "EMU",
      smsBaseUrl: "https://api.taqnyat.sa.evil.example",
    } as AppConfig, fetchImpl);
    await expect(blocked.send("0551234567", "رمز الدخول")).rejects.toThrow(/not configured/);
    expect(calls).toHaveLength(1);
  });
});
