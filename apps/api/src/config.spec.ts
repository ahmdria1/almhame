import { readFileSync } from "fs";
import { join } from "path";
import { cookieSecure, cookieSettings, setAccessCookie } from "./cookies";
import { assertProductionProviders, loadConfig, type AppConfig } from "./config";

function production(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: "production",
    llmProvider: "remote",
    embeddingProvider: "remote",
    smsProvider: "taqnyat",
    smsApiKey: "sms-key",
    smsBaseUrl: "https://api.taqnyat.sa",
    smsSender: "EMU",
    paymentGateway: "alrajhi",
    modelBaseUrl: "https://model.example.sa",
    modelApiKey: "model-key",
    modelName: "draft",
    embeddingBaseUrl: "https://embed.example.sa",
    embeddingApiKey: "embed-key",
    embeddingModel: "embed",
    alrajhiTranportalId: "tran",
    alrajhiTranportalPassword: "pass",
    alrajhiResourceKey: "0123456789abcdef",
    integrationsMode: "live",
    googleClientId: "google",
    googleClientSecret: "google-secret",
    msClientId: "ms",
    msClientSecret: "ms-secret",
    najizBaseUrl: "https://developers.najiz.sa",
    najizClientId: "najiz",
    najizClientSecret: "najiz-secret",
    nafathBaseUrl: "https://nafath.api.elm.sa",
    nafathAppId: "nafath-app",
    nafathAppKey: "nafath-key",
    nafathService: "login",
    expoAccessToken: "expo-token",
    clamavHost: "clamav",
    storageDir: "/var/lib/elawyer",
    sellerVat: "311111111111113",
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
    expect(() => assertProductionProviders(production({ embeddingProvider: "mock" }))).toThrow(/EMBEDDING_PROVIDER/);
    expect(() => assertProductionProviders(production({ llmProvider: "mock" }))).toThrow(/LLM_PROVIDER/);
    expect(() => assertProductionProviders(production({ najizClientId: "" }))).toThrow(/NAJIZ_CLIENT_ID/);
    expect(() => assertProductionProviders(production({ nafathAppId: "" }))).toThrow(/NAFATH_APP_ID/);
    expect(() => assertProductionProviders(production({ smsProvider: "mock" }))).toThrow(/SMS_SENDER/);
    expect(() => assertProductionProviders(production({ smsSender: "" }))).toThrow(/SMS_SENDER/);
    expect(() => assertProductionProviders(production({ smsSender: "test" }))).toThrow(/SMS_SENDER/);
    expect(() => assertProductionProviders(production({ smsProvider: "http" }))).toThrow(/SMS_SENDER/);
    expect(() => assertProductionProviders(production({ integrationsMode: "stub" }))).toThrow(/INTEGRATIONS_MODE/);
    expect(() => assertProductionProviders(production({ expoAccessToken: "" }))).toThrow(/EXPO_ACCESS_TOKEN/);
    expect(() => assertProductionProviders(production({ sellerVat: "300000000000003" }))).toThrow(/SELLER_VAT_NUMBER/);
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
    expect(local.clamavRequired).toBe(false);
    expect(local.clamavHost).toBe("");
    expect(local.smtpFrom).toBe("no-reply@emuhami.com");
    expect(local.cookieDomain).toBe("");
    expect(local.corsOrigins).toEqual(expect.arrayContaining(["https://emuhami.com", "https://admin.emuhami.com", "http://127.0.0.1:4720"]));
    const live = loadConfig({ ...base, NODE_ENV: "production", SMTP_FROM: "desk@emuhami.com", COOKIE_DOMAIN: ".emuhami.com" });
    expect(live.smtpFrom).toBe("desk@emuhami.com");
    expect(live.clamavRequired).toBe(true);
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