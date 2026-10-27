import { createServer, type Server } from "net";
import { InfectedUpload, ScannerDown, pingScanner, scanInstream } from "./clamd";

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

async function listen(handler: (body: Buffer) => Buffer | null): Promise<{ server: Server; port: number }> {
  const server = createServer((socket) => {
    const chunks: Buffer[] = [];
    socket.on("data", (chunk) => {
      chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const ping = body.toString("latin1").startsWith("zPING");
      const finished = body.length >= 14 && body.subarray(body.length - 4).equals(Buffer.alloc(4));
      if (!ping && !finished) return;
      const reply = handler(body);
      if (reply) socket.end(reply);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  return { server, port: address.port };
}

describe("clamd instream", () => {
  const servers: Server[] = [];

  afterEach(() => {
    for (const server of servers) server.close();
    servers.length = 0;
  });

  it("accepts a clean stream and rejects the EICAR test string", async () => {
    const { server, port } = await listen((body) => {
      expect(body.subarray(0, 10).toString("latin1")).toBe("zINSTREAM\0");
      const infected = body.toString("latin1").includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE");
      return Buffer.from(infected ? "stream: Eicar-Test-Signature FOUND\0" : "stream: OK\0");
    });
    servers.push(server);
    await expect(scanInstream(Buffer.from("clean-pdf"), { host: "127.0.0.1", port })).resolves.toBeUndefined();
    await expect(scanInstream(Buffer.from(EICAR), { host: "127.0.0.1", port })).rejects.toBeInstanceOf(InfectedUpload);
  });

  it("fails closed when the daemon does not answer", async () => {
    await expect(scanInstream(Buffer.from("x"), { host: "127.0.0.1", port: 1, timeoutMs: 200 })).rejects.toBeInstanceOf(ScannerDown);
    const { server, port } = await listen(() => null);
    servers.push(server);
    await expect(scanInstream(Buffer.from("x"), { host: "127.0.0.1", port, timeoutMs: 50 })).rejects.toBeInstanceOf(ScannerDown);
    await expect(pingScanner({ host: "127.0.0.1", port: 1, timeoutMs: 50 })).resolves.toBe(false);
  });

  it("answers a ping", async () => {
    const { server, port } = await listen((body) => (body.toString("latin1").startsWith("zPING") ? Buffer.from("PONG\0") : Buffer.from("stream: OK\0")));
    servers.push(server);
    await expect(pingScanner({ host: "127.0.0.1", port })).resolves.toBe(true);
  });
});
