import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const marker = /_0x[0-9a-fA-F]{2,}/;

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === "cache") continue;
      walk(full, acc);
    } else acc.push(full);
  }
  return acc;
}

const emitted = ["apps/api/dist", "apps/web/.next", "apps/admin/.next"].flatMap((rel) => walk(path.join(root, rel)));
const maps = emitted.filter((file) => file.endsWith(".map"));
if (maps.length) {
  console.error(maps.map((file) => path.relative(root, file)).slice(0, 30).join("\n"));
  console.error(`${maps.length} source map file(s)`);
  process.exit(1);
}

for (const app of ["web", "admin"]) {
  const chunks = walk(path.join(root, "apps", app, ".next", "static")).filter((file) => file.endsWith(".js"));
  const obfuscated = chunks.filter((file) => marker.test(readFileSync(file, "utf8")));
  if (obfuscated.length === 0) {
    console.error(`${app} client JavaScript is not obfuscated (${chunks.length} scripts)`);
    process.exit(1);
  }
  console.log(`${app}: ${obfuscated.length} obfuscated client scripts, 0 source maps`);
}

const apiJs = emitted.filter((file) => file.startsWith(path.join(root, "apps/api/dist")) && file.endsWith(".js"));
if (apiJs.length === 0) {
  console.error("api build produced no JavaScript");
  process.exit(1);
}
console.log(`api: ${apiJs.length} scripts, 0 source maps`);
