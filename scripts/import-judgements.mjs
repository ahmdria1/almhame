import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const limit = process.argv.find((arg) => arg.startsWith("--limit=")) || "--limit=3";
const script = path.join(root, "corpus", "fetch-judgements.mjs");

const child = spawn(process.execPath, [script, limit], { cwd: root, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
