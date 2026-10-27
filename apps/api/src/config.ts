export interface AppConfig {
  databaseUrl: string;
  jwtSecret: string;
  kmsMasterKey: string;
  otpPepper: string;
  otpDebug: boolean;
  port: number;
  apiPublicUrl: string;
  webOrigin: string;
  adminOrigin: string;
  llmProvider: string;
  modelBaseUrl: string;
  modelApiKey: string;
  modelName: string;
  embeddingProvider: string;
  embeddingBaseUrl: string;
  embeddingApiKey: string;
  embeddingModel: string;
  paymentGateway: string;
  paymentSandboxSecret: string;
  alrajhiTranportalId: string;
  alrajhiTranportalPassword: string;
  alrajhiResourceKey: string;
  alrajhiHostedUrl: string;
  alrajhiResponseUrl: string;
  alrajhiErrorUrl: string;
  payPerMemoHalalas: number;
  sellerName: string;
  sellerVat: string;
  sellerAddress: string;
  storageDir: string;
  adminEmail: string;
  adminPassword: string;
  redisUrl: string;
  sentryDsn: string;
  smsProvider: string;
  smsApiKey: string;
  smsSender: string;
  smsBaseUrl: string;
  integrationsMode: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUrl: string;
  msClientId: string;
  msClientSecret: string;
  msRedirectUrl: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  consentVersion: string;
  fontPath: string;
  chromiumPath: string;
  emailDebug: boolean;
  outboxDir: string;
  nodeEnv: string;
  corsOrigins: string[];
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const webOrigin = env.WEB_ORIGIN || "http://127.0.0.1:4720";
  const adminOrigin = env.ADMIN_ORIGIN || "http://127.0.0.1:4730";
  const extra = (env.CORS_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  return {
    databaseUrl: required("DATABASE_URL", env.DATABASE_URL),
    jwtSecret: required("JWT_SECRET", env.JWT_SECRET),
    kmsMasterKey: required("KMS_MASTER_KEY", env.KMS_MASTER_KEY),
    otpPepper: env.OTP_PEPPER || required("JWT_SECRET", env.JWT_SECRET),
    otpDebug: env.OTP_DEBUG === "true",
    port: Number(env.PORT || 4710),
    apiPublicUrl: env.API_PUBLIC_URL || `http://127.0.0.1:${env.PORT || 4710}`,
    webOrigin,
    adminOrigin,
    llmProvider: env.LLM_PROVIDER || "mock",
    modelBaseUrl: env.MODEL_BASE_URL || "",
    modelApiKey: env.MODEL_API_KEY || "",
    modelName: env.MODEL_NAME || "draft-model",
    embeddingProvider: env.EMBEDDING_PROVIDER || "mock",
    embeddingBaseUrl: env.EMBEDDING_BASE_URL || "",
    embeddingApiKey: env.EMBEDDING_API_KEY || "",
    embeddingModel: env.EMBEDDING_MODEL || "embed-model",
    paymentGateway: env.PAYMENT_GATEWAY || "sandbox",
    paymentSandboxSecret: env.PAYMENT_SANDBOX_SECRET || "sandbox-dev-secret",
    alrajhiTranportalId: env.ALRAJHI_TRANPORTAL_ID || "",
    alrajhiTranportalPassword: env.ALRAJHI_TRANPORTAL_PASSWORD || "",
    alrajhiResourceKey: env.ALRAJHI_RESOURCE_KEY || "",
    alrajhiHostedUrl: env.ALRAJHI_HOSTED_URL || "https://securepayments.alrajhibank.com.sa/pg/payment/hosted.htm",
    alrajhiResponseUrl: env.ALRAJHI_RESPONSE_URL || "",
    alrajhiErrorUrl: env.ALRAJHI_ERROR_URL || "",
    payPerMemoHalalas: Number(env.PAY_PER_MEMO_HALALAS || 2900),
    sellerName: env.SELLER_NAME || "المحامي الإلكتروني المتقدم",
    sellerVat: env.SELLER_VAT_NUMBER || "300000000000003",
    sellerAddress: env.SELLER_ADDRESS || "Riyadh, SA",
    storageDir: env.STORAGE_DIR || "./data/storage",
    adminEmail: env.ADMIN_EMAIL || "",
    adminPassword: env.ADMIN_PASSWORD || "",
    redisUrl: env.REDIS_URL || "",
    sentryDsn: env.SENTRY_DSN || "",
    smsProvider: env.SMS_PROVIDER || "mock",
    smsApiKey: env.SMS_API_KEY || "",
    smsSender: env.SMS_SENDER || "",
    smsBaseUrl: env.SMS_BASE_URL || "",
    integrationsMode: env.INTEGRATIONS_MODE || "stub",
    googleClientId: env.GOOGLE_CLIENT_ID || "",
    googleClientSecret: env.GOOGLE_CLIENT_SECRET || "",
    googleRedirectUrl: env.GOOGLE_REDIRECT_URL || "",
    msClientId: env.MS_CLIENT_ID || "",
    msClientSecret: env.MS_CLIENT_SECRET || "",
    msRedirectUrl: env.MS_REDIRECT_URL || "",
    smtpHost: env.SMTP_HOST || "",
    smtpPort: Number(env.SMTP_PORT || 587),
    smtpUser: env.SMTP_USER || "",
    smtpPass: env.SMTP_PASS || "",
    smtpFrom: env.SMTP_FROM || "",
    consentVersion: env.PDPL_CONSENT_VERSION || "2026-01",
    fontPath: env.FONT_PATH || "",
    chromiumPath: env.CHROMIUM_PATH || "",
    emailDebug: env.EMAIL_DEBUG === "true",
    outboxDir: env.OUTBOX_DIR || "",
    nodeEnv: env.NODE_ENV || "development",
    corsOrigins: [...new Set([webOrigin, adminOrigin, "http://127.0.0.1:4740", "http://localhost:4740", ...extra])],
  };
}

const DEV_KMS_MASTER_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
const DEV_JWT_SECRET = "replace-with-a-long-random-string";
const DEV_OTP_PEPPER = "replace-with-another-long-random-string";

export function debugCodeResponseEnabled(config: AppConfig): boolean {
  return config.nodeEnv === "test";
}

export function assertProductionProviders(config: AppConfig): void {
  if (config.nodeEnv !== "production") return;
  const blocked: string[] = [];
  if (config.llmProvider === "mock") blocked.push("LLM_PROVIDER");
  if (config.embeddingProvider === "mock") blocked.push("EMBEDDING_PROVIDER");
  if (config.smsProvider === "mock") blocked.push("SMS_PROVIDER");
  if (config.paymentGateway === "sandbox" || config.paymentGateway === "mock") blocked.push("PAYMENT_GATEWAY");
  if (!config.smtpHost || !config.smtpFrom) blocked.push("SMTP_HOST");
  if (config.otpDebug) blocked.push("OTP_DEBUG");
  if (config.emailDebug) blocked.push("EMAIL_DEBUG");
  if (debugCodeResponseEnabled(config)) blocked.push("DEBUG_CODE");
  if (config.jwtSecret === DEV_JWT_SECRET || config.jwtSecret.length < 32) blocked.push("JWT_SECRET");
  if (config.otpPepper === DEV_OTP_PEPPER || config.otpPepper.length < 32) blocked.push("OTP_PEPPER");
  const kmsBytes = Buffer.from(config.kmsMasterKey, "base64");
  if (config.kmsMasterKey === DEV_KMS_MASTER_KEY || kmsBytes.length < 32) blocked.push("KMS_MASTER_KEY");
  if (blocked.length) {
    throw new Error(`Refusing to boot with mock or missing providers: ${blocked.join(", ")}`);
  }
}
