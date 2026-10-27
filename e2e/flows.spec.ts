import { readFileSync } from "fs";
import { expect, test, type Page } from "@playwright/test";

const API = "http://127.0.0.1:4710/api";

function phone() {
  return `05${String(Date.now()).slice(-8)}`;
}

async function signUp(page: Page, label: string) {
  const mobile = phone();
  const email = `${label}-${Date.now()}@example.sa`;
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill("أحمد العمراني");
  await page.getByTestId("signup-phone").fill(mobile);
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill("test-pass-123");
  await page.getByTestId("signup-consent").check();
  await page.getByTestId("signup-submit").click();
  await page.waitForURL(/\/otp/);
  const mail = JSON.parse(readFileSync(`/workspace/data/outbox/email_verify-${email}.json`, "utf8")) as { code: string };
  expect(mail.code).toMatch(/^\d{6}$/);
  const code = mail.code;
  await page.getByTestId("otp-input").fill(code);
  await page.getByTestId("otp-submit").click();
  await page.waitForURL(/\/app/);
  return { email, mobile };
}

test("language switch and account menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByTestId("lang-switch").click();
  await page.getByTestId("lang-en").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await signUp(page, "menu");
  await page.getByTestId("account-menu").click();
  await expect(page.getByTestId("menu-wallet")).toBeVisible();
  await expect(page.getByTestId("menu-memos")).toBeVisible();
  await expect(page.getByTestId("menu-saved")).toBeVisible();
  await expect(page.getByTestId("menu-integrations")).toBeVisible();
  await expect(page.getByTestId("menu-subscription")).toBeVisible();
  await expect(page.getByTestId("menu-settings")).toBeVisible();
  await expect(page.getByTestId("menu-logout")).toBeVisible();
});

test("chat, draft, and pdf export", async ({ page }) => {
  await signUp(page, "draft");
  const created = page.waitForResponse((response) => response.url().endsWith("/api/chats") && response.request().method() === "POST" && response.ok());
  await page.getByTestId("new-chat").click();
  await created;
  await page.getByTestId("chat-input").fill("المدعي أحمد العمراني يطالب شركة الأفق للمقاولات بأجر شهر أغسطس الذي لم يصرف بعد انتهاء الخدمة.");
  await page.getByTestId("chat-send").click();
  await expect(page.getByText("المدعي أحمد العمراني")).toBeVisible();
  await page.getByTestId("draft-button").click();
  await page.waitForURL(/\/app\/memos\//);
  await expect(page.getByTestId("memo-body")).toBeVisible();
  const memoId = page.url().split("/").pop();
  const downloaded = page.waitForResponse((response) => response.url().includes("/export.pdf") && response.status() === 200);
  await page.getByTestId("export-pdf").click();
  const pdfResponse = await downloaded;
  const bytes = await pdfResponse.body();
  expect(pdfResponse.status()).toBe(200);
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  expect(bytes.length).toBeGreaterThan(1000);
  expect(memoId).toBeTruthy();
});

test("free chat quota", async ({ page }) => {
  await signUp(page, "quota");
  for (let index = 0; index < 5; index += 1) {
    const created = page.waitForResponse((response) => response.url().endsWith("/api/chats") && response.request().method() === "POST" && response.ok());
    await page.getByTestId("new-chat").click();
    await created;
  }
  await page.getByTestId("new-chat").click();
  await expect(page.getByTestId("quota-modal")).toBeVisible();
});

test("sandbox wallet top-up", async ({ page }) => {
  await signUp(page, "pay");
  await page.goto("/app/wallet");
  await page.getByTestId("topup-100").click();
  await page.waitForURL(/\/pay\/sandbox\//);
  await page.getByTestId("sandbox-confirm").click();
  await page.waitForURL(/\/app\/wallet/);
  await expect(page.getByText("100.00 ر.س").first()).toBeVisible();
});

test("admin session cannot read user content", async ({ request }) => {
  const { execFileSync } = await import("child_process");
  const { readFileSync } = await import("fs");
  execFileSync("psql", [process.env.DATABASE_URL || "postgresql://elawyer:elawyer@127.0.0.1:5432/elawyer", "-c", 'DELETE FROM "OtpChallenge" WHERE "adminId" IS NOT NULL; DELETE FROM "AdminAccount";'], { stdio: "ignore" });
  const created = JSON.parse(execFileSync("node", ["dist/cli.js", "create-admin", "--email", "e2e-admin@example.sa"], {
    cwd: "apps/api",
    env: { ...process.env, NODE_ENV: "test", OUTBOX_DIR: "/workspace/data/outbox", DATABASE_URL: process.env.DATABASE_URL || "postgresql://elawyer:elawyer@127.0.0.1:5432/elawyer" },
    encoding: "utf8",
  })) as { challengeId: string };
  const mail = JSON.parse(readFileSync("/workspace/data/outbox/admin_activate-e2e-admin@example.sa.json", "utf8")) as { code: string };
  const activated = await request.post(`${API}/admin/activate`, {
    data: { challengeId: created.challengeId, code: mail.code, password: "test-admin-pass" },
  });
  expect(activated.ok()).toBeTruthy();
  const login = await request.post(`${API}/admin/login`, {
    data: { email: "e2e-admin@example.sa", password: "test-admin-pass" },
  });
  expect(login.ok()).toBeTruthy();
  const token = (await login.json()).accessToken as string;
  const chats = await request.get(`${API}/chats`, { headers: { Authorization: `Bearer ${token}` } });
  expect(chats.status()).toBe(401);
  const missing = await request.get(`${API}/admin/users/someone/messages`, { headers: { Authorization: `Bearer ${token}` } });
  expect(missing.status()).toBe(404);
  const stats = await request.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
  expect(stats.ok()).toBeTruthy();
  const body = await stats.json();
  expect(body).toHaveProperty("users");
  expect(body).toHaveProperty("revenueHalalas");
  expect(JSON.stringify(body)).not.toContain("contentEnc");
});
