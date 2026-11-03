import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

function screenExists(root: string, route: string): boolean {
  const parts = route.replace(/^\//, "").split("/");
  const direct = path.join(root, ...parts);
  return [direct + ".tsx", path.join(direct, "index.tsx")].some((file) => {
    try {
      return statSync(file).isFile();
    } catch {
      return false;
    }
  });
}

describe("mobile routes", () => {
  it("keeps every linked screen on disk", () => {
    const root = path.join(__dirname, "..", "app");
    const text = files(root).filter((file) => file.endsWith(".tsx")).map((file) => readFileSync(file, "utf8")).join("\n");
    const routes = new Set<string>();
    for (const match of text.matchAll(/href="(\/[^"]+)"/g)) routes.add(match[1]);
    for (const match of text.matchAll(/pathname:\s*"(\/[^"]+)"/g)) routes.add(match[1]);
    for (const match of text.matchAll(/router\.push\("(\/[^"]+)"\)/g)) routes.add(match[1]);
    expect(routes.size).toBeGreaterThan(0);
    for (const route of routes) {
      if (route.startsWith("http")) continue;
      expect(screenExists(root, route)).toBe(true);
    }
  });
});
