import { HttpException } from "@nestjs/common";
import { fail } from "../http-error";
import { socketOriginAllowed } from "./origin";
import { assertSandboxGateway } from "./payments";

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

  it("allows only configured browser origins on the socket", () => {
    const allowed = ["https://emuhami.com", "https://admin.emuhami.com"];
    expect(socketOriginAllowed(undefined, allowed)).toBe(true);
    expect(socketOriginAllowed("https://emuhami.com", allowed)).toBe(true);
    expect(socketOriginAllowed("https://evil.example", allowed)).toBe(false);
  });
});
