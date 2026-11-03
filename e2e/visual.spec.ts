import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const outboxDir = process.env.OUTBOX_DIR || path.join(process.cwd(), "data", "outbox");

const keys = Object.keys(JSON.parse(readFileSync("packages/i18n/src/locales/ar.json", "utf8")) as Record<string, string>);
const shots = process.env.SHOT_DIR || "/tmp/elawyer-shots";
mkdirSync(shots, { recursive: true });
const locales = ["ar", "en", "ur", "fil", "tr"] as const;
const widths = [1440, 390] as const;

function homePath(locale: string): string {
  return locale === "ar" ? "/" : `/${locale}`;
}

function loginPath(locale: string): string {
  return locale === "ar" ? "/login" : `/${locale}/login`;
}

for (const locale of locales) {
  for (const width of widths) {
    test(`public layout ${locale} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(homePath(locale));
      await expect(page.getByTestId("public-header")).toBeVisible();
      const metrics = await page.evaluate(() => {
        const header = document.querySelector("[data-testid=public-header]");
        const box = header?.getBoundingClientRect();
        return {
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
          header: box?.height ?? 0,
          wraps: box ? box.height > 72 : false,
          text: document.body.innerText,
        };
      });
      expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
      expect(metrics.header).toBeGreaterThan(0);
      expect(metrics.header).toBeLessThanOrEqual(72);
      expect(metrics.wraps).toBe(false);
      const leaked = keys.filter((key) => metrics.text.includes(key));
      expect(leaked).toEqual([]);
      await page.screenshot({ path: `${shots}/ui-after-home-${locale}-${width}.png`, fullPage: false });
      await page.goto(loginPath(locale));
      const login = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        text: document.body.innerText,
      }));
      expect(login.scroll).toBeLessThanOrEqual(login.client + 1);
      expect(keys.filter((key) => login.text.includes(key))).toEqual([]);
      await page.screenshot({ path: `${shots}/ui-after-login-${locale}-${width}.png`, fullPage: false });
    });
  }
}

async function signUp(page: Page) {
  const email = `visual-${Date.now()}@example.sa`;
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill("أحمد العمراني");
  await page.getByTestId("signup-phone").fill(`05${String(Date.now()).slice(-8)}`);
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill("test-pass-123");
  await page.getByTestId("signup-consent").check();
  await page.getByTestId("signup-submit").click();
  await page.waitForURL(/\/otp/);
  const mail = JSON.parse(readFileSync(path.join(outboxDir, `email_verify-${email}.json`), "utf8")) as { code: string };
  await page.getByTestId("otp-input").fill(mail.code);
  await page.getByTestId("otp-submit").click();
  await page.waitForURL(/\/app/);
}

test("workspace uses tabs at 390 and columns at 1440", async ({ page }) => {
  await signUp(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  await expect(page.getByRole("button", { name: "المذكرة" })).toBeVisible();
  await expect(page.getByRole("button", { name: "استعد لجلستك" })).toBeVisible();
  await expect(page.getByRole("button", { name: "المصادر" })).toBeVisible();
  await expect(page.getByTestId("chat-input")).toBeVisible();
  await expect(page.getByTestId("new-chat")).toBeHidden();
  const narrow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  expect(narrow).toBe(true);
  await page.screenshot({ path: `${shots}/ui-after-chat-390.png`, fullPage: false });
  await page.getByRole("button", { name: "المحادثات" }).click();
  await expect(page.getByTestId("new-chat")).toBeVisible();
  await page.screenshot({ path: `${shots}/ui-after-chat-drawer-390.png`, fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId("new-chat")).toBeVisible();
  await expect(page.getByTestId("draft-button")).toBeVisible();
  await page.screenshot({ path: `${shots}/ui-after-chat-1440.png`, fullPage: false });
});

const accountScreens = ["wallet", "memos", "saved", "integrations", "settings", "plans"] as const;

test("account screens keep their headings", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/signup");
  await page.screenshot({ path: `${shots}/ui-signup-1440.png`, fullPage: false });
  await signUp(page);
  for (const name of accountScreens) {
    await page.goto(`/app/${name}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const box = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(box?.height || 0).toBeGreaterThan(0);
    await page.screenshot({ path: `${shots}/ui-${name}-1440.png`, fullPage: false });
  }
});

test("admin overview uses the live totals", async ({ page, request }) => {
  const outbox = outboxDir;
  execFileSync("psql", [process.env.DATABASE_URL || "postgresql://elawyer:elawyer@127.0.0.1:5432/elawyer", "-c", 'DELETE FROM "OtpChallenge" WHERE "adminId" IS NOT NULL; DELETE FROM "AdminAccount";'], { stdio: "ignore" });
  const email = "visual-admin@example.sa";
  const created = JSON.parse(execFileSync("node", ["dist/cli.js", "create-admin", "--email", email], {
    cwd: "apps/api",
    env: { ...process.env, NODE_ENV: "test", OUTBOX_DIR: outbox, DATABASE_URL: process.env.DATABASE_URL || "postgresql://elawyer:elawyer@127.0.0.1:5432/elawyer" },
    encoding: "utf8",
  })) as { challengeId: string };
  const mail = JSON.parse(readFileSync(path.join(outbox, `admin_activate-${email}.json`), "utf8")) as { code: string };
  const activated = await request.post("http://127.0.0.1:4710/api/admin/activate", {
    data: { challengeId: created.challengeId, code: mail.code, password: "test-admin-pass" },
  });
  expect(activated.ok()).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:4730");
  await page.screenshot({ path: `${shots}/ui-admin-login-1440.png`, fullPage: false });
  await page.getByTestId("admin-email").fill(email);
  await page.getByTestId("admin-password").fill("test-admin-pass");
  await page.getByRole("button", { name: "دخول" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole("heading", { level: 2, name: "نظرة عامة" })).toBeVisible();
  await page.screenshot({ path: `${shots}/ui-admin-dashboard-1440.png`, fullPage: false });
});
