import { createServer } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const port = Number(process.env.MAIL_SINK_PORT || 2525);
const dir = process.env.MAIL_SINK_DIR || "/tmp/elawyer-mail";
await mkdir(dir, { recursive: true });
let count = 0;

const server = createServer((socket) => {
  socket.write("220 localhost\r\n");
  let buffer = "";
  let collecting = false;
  let message = "";
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    if (collecting) {
      message += buffer;
      buffer = "";
      if (message.includes("\r\n.\r\n")) {
        collecting = false;
        count += 1;
        const file = path.join(dir, `${Date.now()}-${count}.txt`);
        void writeFile(file, message);
        message = "";
        socket.write("250 ok\r\n");
      }
      return;
    }
    const lines = buffer.split("\r\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const command = line.toUpperCase();
      if (command.startsWith("DATA")) {
        collecting = true;
        socket.write("354 end with dot\r\n");
      } else if (command.startsWith("QUIT")) {
        socket.write("221 bye\r\n");
        socket.end();
      } else {
        socket.write("250 ok\r\n");
      }
    }
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`mail sink ${port} ${dir}\n`);
});
