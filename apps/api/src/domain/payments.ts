import { createHmac, timingSafeEqual } from "crypto";

export function assertSandboxGateway(gateway: string): void {
  if (gateway !== "sandbox") {
    throw new Error("SANDBOX_DISABLED");
  }
}

export function signSandbox(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function sandboxSignatureOk(secret: string, payload: string, signature: string): boolean {
  const actual = Buffer.from(signSandbox(secret, payload));
  const expected = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
