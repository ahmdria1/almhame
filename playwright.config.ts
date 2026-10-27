import { defineConfig, devices } from "@playwright/test";

const apiEnv = {
  ...process.env,
  NODE_ENV: "development",
  PORT: "4710",
  OTP_DEBUG: "true",
  LLM_PROVIDER: "mock",
  EMBEDDING_PROVIDER: "mock",
  PAYMENT_GATEWAY: "sandbox",
  PAYMENT_SANDBOX_SECRET: process.env.PAYMENT_SANDBOX_SECRET || "sandbox-dev-secret",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@example.sa",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "AdminPass123!",
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://elawyer:elawyer@127.0.0.1:5432/elawyer",
  JWT_SECRET: process.env.JWT_SECRET || "replace-with-a-long-random-string",
  KMS_MASTER_KEY: process.env.KMS_MASTER_KEY || "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  WEB_ORIGIN: "http://127.0.0.1:4720",
  ADMIN_ORIGIN: "http://127.0.0.1:4730",
  API_PUBLIC_URL: "http://127.0.0.1:4710",
  FONT_PATH: process.env.FONT_PATH || "",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4720",
    trace: "retain-on-failure",
    locale: "ar-SA",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @elawyer/api start",
      url: "http://127.0.0.1:4710/api/health",
      reuseExistingServer: true,
      timeout: 180000,
      env: apiEnv,
    },
    {
      command: "pnpm --filter @elawyer/web dev",
      url: "http://127.0.0.1:4720",
      reuseExistingServer: true,
      timeout: 180000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: "http://127.0.0.1:4710/api",
      },
    },
  ],
});
