import path from "path";
import { fileURLToPath } from "url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const files = [
  "tsconfig.base.json",
  "apps/api/tsconfig.json",
  "apps/web/tsconfig.json",
  "apps/admin/tsconfig.json",
  "apps/mobile/tsconfig.json",
  "packages/api-client/tsconfig.json",
  "packages/i18n/tsconfig.json",
  "packages/tokens/tsconfig.json",
  "packages/types/tsconfig.json",
];
const required = [
  "strict",
  "noUnusedLocals",
  "noUnusedParameters",
  "noImplicitReturns",
  "forceConsistentCasingInFileNames",
];

let failed = false;
for (const rel of files) {
  const file = path.join(root, rel);
  const read = ts.readConfigFile(file, ts.sys.readFile);
  if (read.error) {
    console.error(`${rel} could not be read`);
    failed = true;
    continue;
  }
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(file));
  for (const key of required) {
    if (parsed.options[key] !== true) {
      console.error(`${rel} does not enable ${key}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`typecheck flags ok on ${files.length} configs`);
