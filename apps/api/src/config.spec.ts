import { readFileSync } from "fs";
import { join } from "path";
import { cookieSecure, cookieSettings, setAccessCookie } from "./cookies";
import { assertProductionProviders, loadConfig, type AppConfig } from "./config";

function production(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: "production",
    llmProvider: "remote",
    embeddingProvider: "remote",
    smsProvider: "disabled",
    paymentGateway: "alrajhi",
    smtpHost: "smtp.example.sa",
    smtpFrom: "noreply@example.sa",
    otpDebug: false,
    emailDebug: false,
    jwtSecret: "p".repeat(40),
    otpPepper: "q".repeat(40),
    kmsMasterKey: Buffer.from("k".repeat(32)).toString("base64"),
    ...overrides,
  } as AppConfig;
}

describe("production boot guard", () => {
  it("boots when providers and secrets are real", () => {
    expect(() => assertProductionProviders(production())).not.toThrow();
  });

  it("refuses debug codes, example secrets, and short secrets", () => {
    expect(() => assertProductionProviders(production({ otpDebug: true }))).toThrow(/OTP_DEBUG/);
    expect(() => assertProductionProviders(production({ emailDebug: true }))).toThrow(/EMAIL_DEBUG/);
    expect(() => assertProductionProviders(production({ jwtSecret: "replace-with-a-long-random-string" }))).toThrow(/JWT_SECRET/);
    expect(() => assertProductionProviders(production({ jwtSecret: "short" }))).toThrow(/JWT_SECRET/);
    expect(() => assertProductionProviders(production({ otpPepper: "replace-with-another-long-random-string" }))).toThrow(/OTP_PEPPER/);
    expect(() => assertProductionProviders(production({ otpPepper: "short-pepper" }))).toThrow(/OTP_PEPPER/);
    expect(() => assertProductionProviders(production({ kmsMasterKey: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=" }))).toThrow(/KMS_MASTER_KEY/);
    expect(() => assertProductionProviders(production({ kmsMasterKey: Buffer.from("short").toString("base64") }))).toThrow(/KMS_MASTER_KEY/);
  });

  it("marks production cookies secure", () => {
    expect(cookieSecure("production")).toBe(true);
    expect(cookieSecure("test")).toBe(false);
  });

  it("defaults the sender, the public origins, and the production cookie domain", () => {
    const base = {
      DATABASE_URL: "postgresql://elawyer:elawyer@127.0.0.1:5432/elawyer",
      JWT_SECRET: "j".repeat(40),
      KMS_MASTER_KEY: Buffer.from("k".repeat(32)).toString("base64"),
      WEB_ORIGIN: "http://127.0.0.1:4720",
      ADMIN_ORIGIN: "http://127.0.0.1:4730",
    };
    const local = loadConfig({ ...base, NODE_ENV: "test" });
    expect(local.smtpFrom).toBe("no-reply@emuhami.com");
    expect(local.cookieDomain).toBe("");
    expect(local.corsOrigins).toEqual(expect.arrayContaining(["https://emuhami.com", "https://admin.emuhami.com", "http://127.0.0.1:4720"]));
    const live = loadConfig({ ...base, NODE_ENV: "production", SMTP_FROM: "desk@emuhami.com", COOKIE_DOMAIN: ".emuhami.com" });
    expect(live.smtpFrom).toBe("desk@emuhami.com");
    expect(live.cookieDomain).toBe(".emuhami.com");
    expect(cookieSettings(live)).toEqual({ secure: true, domain: ".emuhami.com" });
    const jar: { name?: string; options?: { domain?: string; secure?: boolean } }[] = [];
    setAccessCookie({ cookie: (name, _value, options) => jar.push({ name, options }) } as never, "token", true, live.cookieDomain);
    expect(jar[0]).toEqual({ name: "elw_access", options: expect.objectContaining({ domain: ".emuhami.com", secure: true, path: "/api" }) });
    const nginx = readFileSync(join(__dirname, "../../../docker/nginx/nginx.conf"), "utf8");
    expect(nginx).toContain("server_name emuhami.com admin.emuhami.com");
    expect(nginx).toContain("server_name www.emuhami.com");
    expect(nginx).toContain("return 301 https://emuhami.com$request_uri");
    expect(nginx).toContain("/etc/letsencrypt/live/emuhami.com/fullchain.pem");
    const compose = readFileSync(join(__dirname, "../../../docker-compose.yml"), "utf8");
    expect(compose).toContain("memory: 2G");
    expect(compose).toContain("memory: 1280M");
    expect(compose).toContain("--maxmemory\", \"256mb\"");
    expect(compose).toContain("--max-old-space-size=768");
    expect(compose).toContain("--max-old-space-size=640");
  });

  it("ignores the guard outside production", () => {
    expect(() => assertProductionProviders(production({ nodeEnv: "test", otpDebug: true, jwtSecret: "short" }))).not.toThrow();
  });
});