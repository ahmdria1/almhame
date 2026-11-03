import { readdir, readFile, writeFile } from "node:fs/promises";

const api = process.env.API_URL || "http://127.0.0.1:4710";
const count = Number(process.env.LOAD_USERS || "2");
const mailDir = process.env.MAIL_SINK_DIR || "/tmp/elawyer-mail";
const out = process.env.LOAD_USERS_FILE || "/tmp/elawyer-load-users.json";

function phone(index) {
  const base = Number(String(Date.now()).slice(-7));
  return `05${String((base + index) % 100000000).padStart(8, "0")}`;
}

async function codeFromMail(email) {
  const names = await readdir(mailDir).catch(() => []);
  const files = names.sort().reverse();
  for (const name of files) {
    const text = await readFile(`${mailDir}/${name}`, "utf8");
    if (!text.includes(email)) continue;
    const match = text.match(/الرمز:\s*(\d{6})/);
    if (match) return match[1];
  }
  return "";
}

const users = [];
for (let index = 0; index < count; index += 1) {
  const email = `load${Date.now()}${index}@example.sa`;
  const password = "load-pass-123";
  const signup = await fetch(`${api}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": `203.0.113.${(index % 200) + 1}` },
    body: JSON.stringify({ name: "قياس الحمل", phone: phone(index), email, password, consent: true }),
  });
  const signupBody = await signup.json().catch(() => ({}));
  if (!signup.ok) throw new Error(`signup ${signup.status} ${JSON.stringify(signupBody)}`);
  let code = signupBody.debugCode || "";
  if (!code) {
    for (let attempt = 0; attempt < 20 && !code; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      code = await codeFromMail(email);
    }
  }
  if (!code) throw new Error(`no verification code for ${email}`);
  const verified = await fetch(`${api}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId: signupBody.challengeId, code }),
  });
  const verifiedBody = await verified.json().catch(() => ({}));
  if (!verified.ok) throw new Error(`verify ${verified.status} ${JSON.stringify(verifiedBody)}`);
  users.push({ email, password, token: verifiedBody.accessToken });
}

await writeFile(out, JSON.stringify(users));
process.stdout.write(`${users.length} accounts in ${out}\n`);
