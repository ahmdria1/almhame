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
