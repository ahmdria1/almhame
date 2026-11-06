import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import type { Socket } from "socket.io";
import { loadConfig } from "./config";
import { socketOriginAllowed } from "./domain/origin";
import { WorkService } from "./work.service";

const socketCors = {
  origin: (origin: string | undefined, callback: (err: Error | null, ok?: boolean) => void) => {
    callback(null, socketOriginAllowed(origin, loadConfig().corsOrigins));
  },
  credentials: true,
};

@WebSocketGateway({ cors: socketCors })
export class ChatGateway implements OnGatewayConnection {
  constructor(
    private readonly jwt: JwtService,
    private readonly work: WorkService,
  ) {}

  handleConnection(socket: Socket) {
    const origin = socket.handshake.headers.origin;
    if (!socketOriginAllowed(origin ? String(origin) : undefined, loadConfig().corsOrigins)) {
      socket.disconnect(true);
    }
  }

  @SubscribeMessage("send")
  async send(@MessageBody() body: { chatId?: string; text?: string }, @ConnectedSocket() socket: Socket) {
    try {
      const headerToken = String(socket.handshake.auth?.token || "");
      const cookie = String(socket.handshake.headers.cookie || "");
      const fromCookie = cookie.match(/(?:^|;\s*)elw_access=([^;]+)/);
      const token = headerToken || (fromCookie ? decodeURIComponent(fromCookie[1]) : "");
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(token);
      if (payload.role !== "user" || !body.chatId || !body.text) {
        socket.emit("error", { code: "UNAUTHENTICATED" });
        return { ok: false };
      }
      const result = await this.work.sendMessage(payload.sub, body.chatId, body.text);
      const parts = result.counsel.content.match(/[\s\S]{1,32}/g) || [result.counsel.content];
      for (const chunk of parts) socket.emit("token", { chatId: body.chatId, chunk });
      socket.emit("done", { chatId: body.chatId, message: result.counsel, readyToDraft: result.readyToDraft });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "error";
      socket.emit("error", { code: "SEND_FAILED", message });
      return { ok: false };
    }
  }
}
