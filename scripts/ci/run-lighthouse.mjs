import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.95,
  "best-practices": 0.95,
  seo: 0.95,
};

function locales() {
  const source = readFileSync(path.join(root, "packages/types/src/index.ts"), "utf8");
  const block = source.match(/export const LOCALES = \[([\s\S]*?)\] as const/);
  if (!block) throw new Error("LOCALES was not found");
  return [...block[1].matchAll(/"([a-z]{2,3})"/g)].map((match) => match[1]);
}

function chromePath() {
  const candidates = [process.env.CHROME_PATH, process.env.CHROMIUM_PATH, "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/usr/local/bin/google-chrome"].filter(Boolean);
  const found = candidates.find((item) => existsSync(item));
  if (!found) throw new Error("Chromium was not found");
  return found;
}

function originOf() {
  const value = (process.env.SITE_URL || "").trim().replace(/\/$/, "");
  if (!value) throw new Error("SITE_URL is not set");
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("SITE_URL must be an http(s) URL");
  return url.origin;
}

function auditUrls(origin, localeList, locs) {
  const others = localeList.filter((locale) => locale !== "ar");
  const prefixed = (pathname) => others.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  const arabic = locs.filter((loc) => !prefixed(new URL(loc).pathname));
  const urls = [...arabic];
  for (const locale of others) {
    const home = new URL(`/${locale}`, origin).href;
    if (!urls.includes(home)) urls.push(home);
  }
  const expected = locs.length / localeList.length + others.length;
  if (!Number.isInteger(expected) || urls.length !== expected) {
    throw new Error(`expected ${expected} lighthouse urls, got ${urls.length}`);
  }
  return urls;
}

async function waitFor(url, child) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("web server exited before it was ready");
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("web server did not become ready");
}

function reportFiles(outputDir) {
  if (!existsSync(outputDir)) return [];
  return readdirSync(outputDir)
    .filter((name) => name.endsWith(".report.json") || (name.startsWith("lhr-") && name.endsWith(".json")))
    .map((name) => path.join(outputDir, name))
    .sort();
}

function printReports(outputDir) {
  const files = reportFiles(outputDir);
  if (files.length === 0) throw new Error(`no Lighthouse reports in ${outputDir}`);
  let failed = 0;
  for (const file of files) {
    const report = JSON.parse(readFileSync(file, "utf8"));
    if (report.configSettings?.formFactor !== "mobile") {
      throw new Error(`Lighthouse ran as ${report.configSettings?.formFactor || "an unknown form factor"}`);
    }
    const requested = report.requestedUrl || report.finalUrl;
    const scores = {};
    for (const key of Object.keys(THRESHOLDS)) {
      const score = report.categories?.[key]?.score;
      scores[key] = score == null ? null : Math.round(score * 100);
      if (score == null || score < THRESHOLDS[key]) failed += 1;
    }
    console.log(`${requested}  performance ${scores.performance}  accessibility ${scores.accessibility}  best-practices ${scores["best-practices"]}  seo ${scores.seo}`);
  }
  return failed;
}

async function main() {
  const origin = originOf();
  const chrome = chromePath();
  const localeList = locales();
  const outputDir = mkdtempSync(path.join(tmpdir(), "elawyer-lighthouse-"));

  const child = spawn("pnpm", ["--filter", "@elawyer/web", "start"], {
    cwd: root,
    env: { ...process.env, SITE_URL: origin },
    stdio: "inherit",
  });
  const stop = () => {
    if (child.exitCode === null) child.kill("SIGTERM");
  };
  process.on("SIGINT", () => {
    stop();
    process.exit(1);
  });

  try {
    await waitFor(origin, child);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await fetch(new URL("/", origin)).catch(() => undefined);
    }
    const sitemap = await fetch(new URL("/sitemap.xml", origin)).then((response) => {
      if (!response.ok) throw new Error(`sitemap responded ${response.status}`);
      return response.text();
    });
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const override = (process.env.LIGHTHOUSE_URLS || "").split(",").map((item) => item.trim()).filter(Boolean);
    const urls = override.length ? override : auditUrls(origin, localeList, locs);
    const configPath = path.join(outputDir, "lighthouserc.json");
    const config = {
      ci: {
        collect: {
          url: urls,
          numberOfRuns: 1,
          settings: {
            chromeFlags: "--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage",
            onlyCategories: Object.keys(THRESHOLDS),
            maxWaitForLoad: 60000,
          },
        },
        assert: {
          assertions: {
            "categories:performance": ["error", { minScore: THRESHOLDS.performance }],
            "categories:accessibility": ["error", { minScore: THRESHOLDS.accessibility }],
            "categories:best-practices": ["error", { minScore: THRESHOLDS["best-practices"] }],
            "categories:seo": ["error", { minScore: THRESHOLDS.seo }],
          },
        },
        upload: { target: "filesystem", outputDir },
      },
    };
    writeFileSync(configPath, JSON.stringify(config));
    const lhci = spawn("pnpm", ["exec", "lhci", "autorun", `--config=${configPath}`], {
      cwd: root,
      env: { ...process.env, CHROME_PATH: chrome, SITE_URL: origin },
      stdio: "inherit",
    });
    const code = await new Promise((resolve, reject) => {
      lhci.on("error", reject);
      lhci.on("exit", (status) => resolve(status ?? 1));
    });
    const failed = printReports(outputDir);
    if (code !== 0 || failed > 0) process.exitCode = 1;
  } finally {
    stop();
    rmSync(path.join(root, ".lighthouseci"), { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
