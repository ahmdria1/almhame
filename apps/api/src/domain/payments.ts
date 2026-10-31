import { createHmac, timingSafeEqual } from "crypto";

export function sandboxRoutesEnabled(nodeEnv: string): boolean {
  return nodeEnv !== "production";
}

export function assertSandboxGateway(gateway: string): void {
  if (gateway !== "sandbox") {
    throw new Error("SANDBOX_DISABLED");
  }
}

type ExpressLayer = {
  route?: { path?: string | string[] };
  handle?: { stack?: ExpressLayer[] };
  path?: string;
};

export function collectExpressPaths(stack: ExpressLayer[] | undefined, prefix = ""): string[] {
  if (!stack) return [];
  const out: string[] = [];
  for (const layer of stack) {
    const routePath = layer.route?.path;
    const paths = Array.isArray(routePath) ? routePath : routePath ? [routePath] : [];
    for (const path of paths) out.push(`${prefix}${path}`.replace(/\/{2,}/g, "/"));
    const mount = typeof layer.path === "string" ? layer.path : "";
    if (layer.handle?.stack) out.push(...collectExpressPaths(layer.handle.stack, `${prefix}${mount}`));
  }
  return out;
}

export function assertNoSandboxPaymentRoutes(nodeEnv: string, paths: readonly string[]): void {
  if (nodeEnv !== "production") return;
  const hit = paths.filter((path) => /\/payments\/confirm$/.test(path) || /\/payments\/webhook$/.test(path));
  if (hit.length) throw new Error(`Refusing to boot with sandbox payment routes: ${hit.join(", ")}`);
}

export function signSandbox(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function sandboxSignatureOk(secret: string, payload: string, signature: string): boolean {
  const actual = Buffer.from(signSandbox(secret, payload));
  const expected = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
