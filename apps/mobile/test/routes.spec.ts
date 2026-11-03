import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const appDir = join(__dirname, "../app");
const hubSource = readFileSync(join(__dirname, "../src/nav.tsx"), "utf8");

const SCREENS = [
  "/",
  "/onboarding",
  "/login",
  "/signup",
  "/otp",
  "/home",
  "/account",
  "/plans",
  "/wallet",
  "/memos",
  "/saved",
  "/integrations",
  "/settings",
  "/chat/[id]",
  "/memo/[id]",
];

function files(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...files(full));
    else if (name.endsWith(".tsx") && name !== "_layout.tsx") found.push(full);
  }
  return found;
}

function routeOf(file: string): string {
  const rel = file.slice(appDir.length).replace(/\\/g, "/").replace(/\.tsx$/, "");
  if (rel === "/index") return "/";
  return rel;
}

function targets(source: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /href="(\/[^"]*)"/g,
    /href:\s*"(\/[^"]*)"/g,
    /pathname:\s*"(\/[^"]*)"/g,
    /router\.(?:push|replace)\(\s*"(\/[^"]*)"/g,
    /router\.(?:push|replace)\(\s*\{\s*pathname:\s*"(\/[^"]*)"/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(match[1].replace(/\/$/, "") || "/");
  }
  return [...found];
}

function screenExists(target: string): boolean {
  const clean = target.split("?")[0].replace(/\/$/, "") || "/";
  if (SCREENS.includes(clean)) return true;
  const rel = clean.replace(/^\//, "");
  return existsSync(join(appDir, `${rel}.tsx`)) || existsSync(join(appDir, rel, "index.tsx"));
}

describe("expo navigation", () => {
  const hub = targets(hubSource);
  const edges = new Map<string, string[]>();
  for (const file of files(appDir)) {
    const source = readFileSync(file, "utf8");
    const route = routeOf(file);
    const next = new Set(targets(source));
    if (source.includes("<Hub")) hub.forEach((item) => next.add(item));
    edges.set(route, [...next]);
  }

  it("lists every screen", () => {
    expect([...edges.keys()].sort()).toEqual([...SCREENS].sort());
  });

  it("reaches every screen from the splash and leaves no dead end", () => {
    const seen = new Set<string>(["/"]);
    const queue = ["/"];
    while (queue.length) {
      const current = queue.shift() || "/";
      for (const next of edges.get(current) || []) {
        expect(screenExists(next)).toBe(true);
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
      expect((edges.get(current) || []).length).toBeGreaterThan(0);
    }
    expect([...seen].sort()).toEqual([...SCREENS].sort());
  });
});
