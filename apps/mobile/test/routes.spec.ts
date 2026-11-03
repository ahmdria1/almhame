import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const appDir = join(__dirname, "../app");

function files(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...files(full));
    else if (name.endsWith(".tsx")) found.push(full);
  }
  return found;
}

function targets(source: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /href="(\/[^"]*)"/g,
    /href:\s*"(\/[^"]*)"/g,
    /pathname:\s*"(\/[^"]*)"/g,
    /router\.(?:push|replace)\(\s*"(\/[^"]*)"/g,
    /"(\/(?:[A-Za-z0-9[\]_-]+\/?)+)"/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(match[1].replace(/\/$/, "") || "/");
  }
  return [...found];
}

function screenExists(target: string): boolean {
  const clean = target.split("?")[0].replace(/\/$/, "") || "/";
  if (clean === "/") return existsSync(join(appDir, "index.tsx"));
  const rel = clean.replace(/^\//, "");
  return existsSync(join(appDir, `${rel}.tsx`)) || existsSync(join(appDir, rel, "index.tsx"));
}

describe("expo-router targets", () => {
  const source = files(appDir).map((file) => readFileSync(file, "utf8")).join("\n");
  const found = targets(source);

  it("finds the account destinations", () => {
    for (const path of ["/wallet", "/memos", "/saved", "/integrations", "/plans", "/settings"]) {
      expect(found).toContain(path);
    }
  });

  it("has a screen for every push and Link target", () => {
    const missing = found.filter((path) => !screenExists(path));
    expect(missing).toEqual([]);
  });
});
