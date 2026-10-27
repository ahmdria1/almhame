import { existsSync, readFileSync } from "fs";
import path from "path";

const candidates = [
  process.env.ENV_FILE,
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../.env"),
].filter((value): value is string => Boolean(value));

for (const file of candidates) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
  break;
}
