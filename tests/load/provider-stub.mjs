import { createHash } from "node:crypto";
import { createServer } from "node:http";

// Load run only. This process stands in for the remote model and the embedding
// provider. It returns an empty completion and a 384-number vector. It does not
// return statute text or judgment text.

const port = Number(process.env.PROVIDER_STUB_PORT || 8791);

function vector(text) {
  const values = new Array(384).fill(0);
  const hash = createHash("sha256").update(text).digest();
  for (let index = 0; index < 384; index += 1) values[index] = ((hash[index % hash.length] / 255) * 2 - 1) / 20;
  return values;
}

const server = createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    let payload = {};
    try {
      payload = body ? JSON.parse(body) : {};
    } catch {
      payload = {};
    }
    if ((req.url || "").includes("embeddings")) {
      const input = Array.isArray(payload.input) ? payload.input.join(" ") : String(payload.input || "");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ embedding: vector(input) }] }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: "" } }] }));
  });
});

server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`provider stub ${port}\n`);
});
