import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { traceRules } from "./trace-rules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const hits = [];

function consider(label, text) {
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const rule of traceRules) {
      if (rule.test(lines[index])) hits.push(`${label}:${index + 1}`);
    }
  }
}

function walk(dir, acc) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "cache" || name === "node_modules") continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (stat.size <= 4_000_000 && !full.endsWith(".map")) acc.push(full);
  }
  return acc;
}

const log = execSync("git log --format=%H%x09%an%x09%ae%x09%s%x09%b%x1e", {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 20_000_000,
});
for (const record of log.split("\x1e")) {
  const trimmed = record.trim();
  if (!trimmed) continue;
  const [hash, name, email, subject, body] = trimmed.split("\t");
  consider(`commit ${hash.slice(0, 8)} author`, `${name} ${email}`);
  consider(`commit ${hash.slice(0, 8)} message`, `${subject}\n${body || ""}`);
}

const tracked = execSync("git ls-files -z", { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
const skip = /^(scripts\/ci\/|pnpm-lock.yaml$|.*\.(ttf|woff2?|png|jpg|jpeg|webp|gif|pdf|zip)$)/;
for (const rel of tracked) {
  if (skip.test(rel)) continue;
  const full = path.join(root, rel);
  if (!existsSync(full) || statSync(full).size > 4_000_000) continue;
  consider(rel, readFileSync(full, "utf8"));
}

for (const rel of ["apps/api/dist", "apps/web/.next/static", "apps/web/.next/server", "apps/admin/.next/static", "apps/admin/.next/server"]) {
  for (const full of walk(path.join(root, rel), [])) {
    consider(path.relative(root, full), readFileSync(full, "utf8"));
  }
}

if (hits.length) {
  console.error(hits.slice(0, 40).join("\n"));
  console.error(`${hits.length} tool trace(s)`);
  process.exit(1);
}
console.log("no tool traces in source, commit authors, or build output");
