import { connect } from "net";

export class InfectedUpload extends Error {
  constructor(readonly signature: string) {
    super("infected");
  }
}

export class ScannerDown extends Error {
  constructor() {
    super("scanner down");
  }
}

export interface ScanTarget {
  host: string;
  port: number;
  timeoutMs?: number;
}

function readResponse(chunks: Buffer[]): string {
  return Buffer.concat(chunks).toString("utf8").replace(/\0/g, "").trim();
}

export function scanInstream(bytes: Buffer, target: ScanTarget): Promise<void> {
  const timeoutMs = target.timeoutMs ?? 15000;
  return new Promise((resolve, reject) => {
    const socket = connect({ host: target.host, port: target.port });
    const received: Buffer[] = [];
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new ScannerDown()), timeoutMs);
    socket.on("error", () => finish(new ScannerDown()));
    socket.on("data", (chunk) => {
      received.push(chunk);
      const text = readResponse(received);
      if (!text) return;
      if (text.endsWith("OK")) {
        finish();
        return;
      }
      if (text.includes("FOUND")) {
        const signature = text.replace(/^stream:\s*/i, "").replace(/\s+FOUND$/, "").trim() || "FOUND";
        finish(new InfectedUpload(signature));
      }
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const size = 64 * 1024;
      for (let offset = 0; offset < bytes.length; offset += size) {
        const chunk = bytes.subarray(offset, offset + size);
        const header = Buffer.alloc(4);
        header.writeUInt32BE(chunk.length);
        socket.write(Buffer.concat([header, chunk]));
      }
      const end = Buffer.alloc(4);
      socket.write(end);
    });
  });
}

export function pingScanner(target: ScanTarget): Promise<boolean> {
  const timeoutMs = target.timeoutMs ?? 400;
  return new Promise((resolve) => {
    const socket = connect({ host: target.host, port: target.port });
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    socket.on("error", () => finish(false));
    socket.on("data", (chunk) => finish(chunk.toString("utf8").includes("PONG")));
    socket.on("connect", () => socket.write("zPING\0"));
  });
}
