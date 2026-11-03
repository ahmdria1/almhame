import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const roots = [join(__dirname, "../src"), join(__dirname, "../../admin/src"), join(__dirname, "../../mobile/app")];

function files(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...files(full));
    else if (name.endsWith(".tsx")) found.push(full);
  }
  return found;
}

function openingTags(source: string, tag: string): string[] {
  return [...source.matchAll(new RegExp(`<${tag}\\b[\\s\\S]*?>`, "g"))].map((match) => match[0]);
}

describe("navigation sources", () => {
  const sources = roots.flatMap((root) => files(root).map((file) => ({ file, source: readFileSync(file, "utf8") })));

  it("has no empty, bare, or script href", () => {
    const problems: string[] = [];
    for (const { file, source } of sources) {
      const lines = source.split("\n");
      lines.forEach((line, index) => {
        if (/href=["']\s*["']/.test(line) || /href=["']#["']/.test(line) || /javascript:/i.test(line)) {
          problems.push(`${file}:${index + 1}`);
        }
      });
    }
    expect(problems).toEqual([]);
  });

  it("gives every button a submit action or a click handler", () => {
    const problems: string[] = [];
    for (const { file, source } of sources) {
      for (const tag of openingTags(source, "button").concat(openingTags(source, "Button"))) {
        const type = tag.match(/\btype=["']([^"']+)["']/)?.[1] || "";
        if (type !== "button") continue;
        if (/\bonClick=/.test(tag)) continue;
        const at = source.indexOf(tag);
        const line = source.slice(0, at).split("\n").length;
        problems.push(`${file}:${line}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
