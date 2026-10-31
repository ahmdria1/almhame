import { HttpException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { fail } from "../http-error";
import { socketOriginAllowed } from "./origin";
import { assertNoSandboxPaymentRoutes, assertSandboxGateway, collectExpressPaths, sandboxRoutesEnabled } from "./payments";
import { hashCost, hashPassword, passwordMatches } from "./password";

describe("sandbox and socket origin", () => {
  it("refuses sandbox confirmation unless the gateway is the sandbox", () => {
    expect(() => assertSandboxGateway("sandbox")).not.toThrow();
    expect(() => assertSandboxGateway("alrajhi")).toThrow(/SANDBOX_DISABLED/);
    expect(() => assertSandboxGateway("mock")).toThrow(/SANDBOX_DISABLED/);
  });

  it("maps a disabled sandbox to a not-found response", () => {
    const gate = (gateway: string) => {
      try {
        assertSandboxGateway(gateway);
      } catch {
        fail("NOT_FOUND", 404, "Sandbox confirmation is not available");
      }
    };
    expect(() => gate("alrajhi")).toThrow(HttpException);
    try {
      gate("alrajhi");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(404);
    }
  });

  it("keeps sandbox payment routes off the production process", () => {
    expect(sandboxRoutesEnabled("production")).toBe(false);
    expect(sandboxRoutesEnabled("test")).toBe(true);
    const paths = collectExpressPaths([
      { path: "/api", handle: { stack: [{ route: { path: "/payments/confirm" } }, { route: { path: "/payments/callback" } }] } },
    ]);
    expect(paths).toEqual(["/api/payments/confirm", "/api/payments/callback"]);
    expect(() => assertNoSandboxPaymentRoutes("production", paths)).toThrow(/sandbox payment routes/);
    expect(() => assertNoSandboxPaymentRoutes("test", paths)).not.toThrow();
    expect(() => assertNoSandboxPaymentRoutes("production", ["/api/payments/callback"])).not.toThrow();
  });

  it("rehashes a password stored below cost 12", async () => {
    const lowered = await bcrypt.hash("correct-horse", 10);
    expect(hashCost(lowered)).toBe(10);
    await expect(passwordMatches("correct-horse", lowered)).resolves.toEqual({ ok: true, rehash: true });
    await expect(passwordMatches("wrong-horse", lowered)).resolves.toEqual({ ok: false, rehash: false });
    const fresh = await hashPassword("correct-horse");
    await expect(passwordMatches("correct-horse", fresh)).resolves.toEqual({ ok: true, rehash: false });
  });

  it("allows only configured browser origins on the socket", () => {
    const allowed = ["https://emuhami.com", "https://admin.emuhami.com"];
    expect(socketOriginAllowed(undefined, allowed)).toBe(true);
    expect(socketOriginAllowed("https://emuhami.com", allowed)).toBe(true);
    expect(socketOriginAllowed("https://evil.example", allowed)).toBe(false);
  });
});
