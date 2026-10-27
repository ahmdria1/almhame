import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import type { Socket } from "socket.io";
import { WorkService } from "./work.service";

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class ChatGateway {
  constructor(
    private readonly jwt: JwtService,
    private readonly work: WorkService,
  ) {}

  @SubscribeMessage("send")
  async send(@MessageBody() body: { chatId?: string; text?: string }, @ConnectedSocket() socket: Socket) {
    try {
      const token = String(socket.handshake.auth?.token || "");
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
