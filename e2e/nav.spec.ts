import { execFileSync } from "child_process";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const LOCALES = ["ar", "en", "ur", "hi", "pa", "si", "bn", "ne", "fil", "tr", "am"] as const;
const SHOTS = process.env.SHOT_DIR || "/tmp/elawyer-shots";
const outboxDir = process.env.OUTBOX_DIR || path.join(process.cwd(), "data", "outbox");
const WEB = "http://127.0.0.1:4720";
const ADMIN = "http://127.0.0.1:4730";
const API = "http://127.0.0.1:4710/api";
const PRICES = [
  ["basic", "99"],
  ["pro", "249"],
  ["review", "29"],
  ["defense", "49"],
  ["lawsuit", "59"],
  ["objection", "69"],
  ["chat_pack", "19"],
] as const;

type Row = { from: string; href: string; url: string; status: number; rendered: boolean };

const WEB_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot",
  "/otp",
  "/reset",
  "/app",
  "/app/wallet",
  "/app/memos",
  "/app/cases",
  "/app/saved",
  "/app/vault",
  "/app/integrations",
  "/app/plans",
  "/app/referral",
  "/app/settings",
  "/pay/result",
];

const ADMIN_ROUTES = [
  "/",
  "/activate",
  "/dashboard",
  "/dashboard/users",
  "/dashboard/plans",
  "/dashboard/payments",
  "/dashboard/memos",
  "/dashboard/corpus",
  "/dashboard/costs",
  "/dashboard/operations",
  "/dashboard/settings",
  "/dashboard/audit",
];

function phone() {
  return `05${String(Date.now()).slice(-8)}`;
}

async function signUp(page: Page) {
  const email = `nav-${Date.now()}@example.sa`;
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill("أحمد العمراني");
  await page.getByTestId("signup-phone").fill(phone());
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

async function linksOf(page: Page) {
  return page.locator("a[href]").evaluateAll((nodes) =>
    nodes.map((node) => ({
      href: node.getAttribute("href") || "",
      text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
    })),
  );
}

test("public, account, and admin navigation", async ({ page }) => {
  test.setTimeout(240000);
  mkdirSync(SHOTS, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  const rows: Row[] = [];
  const seen = new Set<string>();

  async function open(from: string, href: string) {
    expect(href, from).not.toBe("");
    expect(href, from).not.toBe("#");
    expect(href, from).not.toMatch(/^javascript:/i);
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
    const url = new URL(href, from);
    if (url.origin !== WEB) return;
    const key = `${url.pathname}${url.search}${url.hash}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (url.pathname.startsWith("/app")) {
      const response = await page.goto(url.pathname + url.search);
      const status = response?.status() || 0;
      await expect(page.getByRole("heading", { level: 1 }), url.href).toBeVisible();
      rows.push({ from, href, url: url.href, status, rendered: true });
      expect(status, url.href).toBeLessThan(400);
      return;
    }
    const response = await page.request.get(url.pathname + url.search);
    const status = response.status();
    const html = await response.text();
    const id = url.hash.replace(/^#/, "");
    const rendered = id ? html.includes(`id="${id}"`) : /<h1[\s>]/.test(html);
    rows.push({ from, href, url: url.href, status, rendered });
    expect(status, url.href).toBeLessThan(400);
    expect(rendered, url.href).toBeTruthy();
  }

  function normalize(pathname: string) {
    return pathname.replace(/^\/(en|ur|hi|pa|si|bn|ne|fil|tr|am)(?=\/|$)/, "") || "/";
  }

  function checkedPaths() {
    return [...new Set(rows.map((row) => normalize(new URL(row.url).pathname)))].sort();
  }

  for (const locale of ["ar", "en"] as const) {
    const start = locale === "ar" ? `${WEB}/` : `${WEB}/en`;
    const response = await page.goto(start);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/home-${locale}.png`, fullPage: false });
    if (locale === "ar") {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${SHOTS}/mobile-home-ar.png`, fullPage: false });
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    const found = await linksOf(page);
    const from = page.url();
    for (const link of found) await open(from, link.href);
  }

  await page.goto("/");
  for (const code of LOCALES) {
    await page.getByTestId("lang-switch").click();
    const link = page.getByTestId(`lang-${code}`);
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toBeTruthy();
    await link.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(page.url()).not.toContain("404");
  }

  await page.goto("/");
  for (const [id, price] of PRICES) {
    const link = page.getByTestId(`price-${id}`);
    await expect(link).toContainText(price);
    const href = await link.getAttribute("href");
    expect(href).toBeTruthy();
    const response = await page.goto(new URL(href || "", WEB).href);
    expect(response?.status(), id).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/");
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/الأسعار");
  await page.screenshot({ path: `${SHOTS}/pricing-ar.png`, fullPage: false });
  await expect(page.getByTestId("price-basic")).toContainText("99");
  await expect(page.getByTestId("price-pro")).toContainText("249");

  for (const path of ["/login", "/signup", "/forgot", "/otp", "/reset"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    rows.push({ from: WEB, href: path, url: new URL(path, WEB).href, status: response?.status() || 0, rendered: true });
    const found = await linksOf(page);
    const from = page.url();
    for (const link of found) await open(from, link.href);
  }

  await signUp(page);
  rows.push({ from: WEB, href: "/app", url: `${WEB}/app`, status: 200, rendered: true });
  const paid = await page.goto("/pay/result?status=paid");
  expect(paid?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  rows.push({ from: WEB, href: "/pay/result", url: `${WEB}/pay/result`, status: paid?.status() || 0, rendered: true });
  for (const link of await linksOf(page)) await open(page.url(), link.href);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  await page.getByRole("button", { name: "المذكرة" }).click();
  await expect(page.getByTestId("draft-button")).toBeVisible();
  await page.getByRole("button", { name: "المصادر" }).click();
  await expect(page.getByText("المستندات")).toBeVisible();
  await page.getByRole("button", { name: "استعد لجلستك" }).click();
  await expect(page.getByTestId("chat-input")).toBeVisible();
  await page.getByRole("button", { name: "المحادثات" }).click();
  await expect(page.getByTestId("new-chat")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const id of ["wallet", "memos", "cases", "saved", "vault", "integrations", "subscription", "referral", "settings"]) {
    await page.goto("/app");
    await page.getByTestId("account-menu").click();
    if (id === "wallet") await page.screenshot({ path: `${SHOTS}/account-menu.png`, fullPage: false });
    await page.getByTestId(`menu-${id}`).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const landed = normalize(new URL(page.url()).pathname);
    rows.push({ from: `${WEB}/app`, href: landed, url: new URL(landed, WEB).href, status: 200, rendered: true });
    const found = await linksOf(page);
    const from = page.url();
    for (const link of found) await open(from, link.href);
  }

  const paths = checkedPaths();
  const missing = WEB_ROUTES.filter((path) => !paths.includes(path));
  expect(missing).toEqual([]);
  writeFileSync(`${SHOTS}/nav-crawl.json`, JSON.stringify({ web: paths, rows }, null, 2));
});

test("admin navigation reaches each section", async ({ page, request }) => {
  execFileSync("psql", [process.env.DATABASE_URL || "postgresql://elawyer:elawyer@127.0.0.1:5432/elawyer", "-c", 'DELETE FROM "OtpChallenge" WHERE "adminId" IS NOT NULL; DELETE FROM "AdminAccount";'], { stdio: "ignore" });
  const email = "nav-admin@example.sa";
  const created = JSON.parse(execFileSync("node", ["dist/cli.js", "create-admin", "--email", email], {
    cwd: "apps/api",
    env: { ...process.env, NODE_ENV: "test", OUTBOX_DIR: outboxDir, DATABASE_URL: process.env.DATABASE_URL || "postgresql://elawyer:elawyer@127.0.0.1:5432/elawyer" },
    encoding: "utf8",
  })) as { challengeId: string };
  const mail = JSON.parse(readFileSync(path.join(outboxDir, `admin_activate-${email}.json`), "utf8")) as { code: string };
  const activated = await request.post(`${API}/admin/activate`, {
    data: { challengeId: created.challengeId, code: mail.code, password: "test-admin-pass" },
  });
  expect(activated.ok()).toBeTruthy();
  await page.goto(ADMIN);
  await page.getByTestId("admin-email").fill(email);
  await page.getByTestId("admin-password").fill("test-admin-pass");
  await page.getByRole("button", { name: "دخول" }).click();
  await page.waitForURL(/\/dashboard/);
  const seen = new Set<string>();
  const queue = ["/dashboard", "/"];
  await page.goto(`${ADMIN}/activate`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  seen.add("/activate");
  await page.goto(`${ADMIN}/`);
  while (queue.length) {
    const href = queue.shift() || "/";
    if (seen.has(href) || href.startsWith("http")) continue;
    const response = await page.goto(new URL(href, ADMIN).href);
    expect(response?.status(), href).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    seen.add(new URL(page.url()).pathname);
    const found = await page.locator("a[href]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") || ""));
    for (const next of found) {
      if (!next || next === "#" || next.startsWith("javascript:") || next.startsWith("mailto:")) continue;
      const url = new URL(next, page.url());
      if (url.origin !== ADMIN) continue;
      if (!seen.has(url.pathname)) queue.push(url.pathname);
    }
  }
  const paths = [...seen].sort();
  const missing = ADMIN_ROUTES.filter((path) => !paths.includes(path));
  expect(missing).toEqual([]);
  const previous = JSON.parse(readFileSync(`${SHOTS}/nav-crawl.json`, "utf8")) as { web: string[] };
  writeFileSync(`${SHOTS}/nav-crawl.json`, JSON.stringify({ web: previous.web, admin: paths }, null, 2));
});
