import { Injectable } from "@nestjs/common";
import { pageMeta, pageQuery } from "./domain/paging";
import { Kernel } from "./kernel";

@Injectable()
export class ChatService {
  constructor(private readonly kernel: Kernel) {}

  async list(userId: string, dek: Buffer, pageRaw?: string, takeRaw?: string) {
    const { page, take, skip } = pageQuery(pageRaw, takeRaw);
    const where = { userId };
    const [total, rows] = await Promise.all([
      this.kernel.prisma.chat.count({ where }),
      this.kernel.prisma.chat.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take }),
    ]);
    return {
      chats: rows.map((chat) => ({
        id: chat.id,
        title: this.kernel.dec(dek, chat.titleEnc),
        court: chat.court,
        memoType: chat.memoType,
        caseId: chat.caseId,
        updatedAt: chat.updatedAt.toISOString(),
      })),
      ...pageMeta(total, page, take),
    };
  }
}
