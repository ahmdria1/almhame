import { cookieSecure } from "./cookies";
import { assertProductionProviders, type AppConfig } from "./config";

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

  it("ignores the guard outside production", () => {
    expect(() => assertProductionProviders(production({ nodeEnv: "test", otpDebug: true, jwtSecret: "short" }))).not.toThrow();
  });
});