import { assertNoSandboxPaymentRoutes, collectExpressPaths, sandboxRoutesEnabled } from "./payments";
import { smsSenderAccepted, taqnyatRecipient } from "./sms-provider";
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
    expect(smsSenderAccepted("mock", "key", "EMU", "https://api.taqnyat.sa")).toBe(false);
    expect(smsSenderAccepted("taqnyat", "key", "", "https://api.taqnyat.sa")).toBe(false);
    expect(taqnyatRecipient("0551234567")).toBe("966551234567");
  });
});
