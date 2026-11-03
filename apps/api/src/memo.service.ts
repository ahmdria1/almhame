import { Injectable } from "@nestjs/common";
import { pageMeta, pageQuery } from "./domain/paging";
import { Kernel } from "./kernel";

@Injectable()
export class MemoService {
  constructor(private readonly kernel: Kernel) {}

  async list(userId: string, dek: Buffer, pageRaw?: string, takeRaw?: string) {
    const { page, take, skip } = pageQuery(pageRaw, takeRaw);
    const where = { userId };
    const [total, rows] = await Promise.all([
      this.kernel.prisma.memo.count({ where }),
      this.kernel.prisma.memo.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take }),
    ]);
    return {
      memos: rows.map((memo) => ({
        id: memo.id,
        title: this.kernel.dec(dek, memo.titleEnc),
        court: memo.court,
        memoType: memo.memoType,
        body: "",
        status: memo.status,
        flagged: memo.flagged,
        caseId: memo.caseId,
        chatId: memo.chatId,
        updatedAt: memo.updatedAt.toISOString(),
        citations: [],
      })),
      ...pageMeta(total, page, take),
    };
  }
}
