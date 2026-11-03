import { Injectable } from "@nestjs/common";
import { blindTokens } from "./domain/blind-index";
import { Kernel } from "./kernel";

@Injectable()
export class SearchService {
  constructor(private readonly kernel: Kernel) {}

  async index(userId: string, dek: Buffer, kind: string, entityId: string, text: string) {
    const tokens = blindTokens(dek, text);
    if (!tokens.length) return;
    await this.kernel.prisma.searchBlind.deleteMany({ where: { userId, kind, entityId } });
    await this.kernel.prisma.searchBlind.createMany({
      data: tokens.map((token) => ({ userId, kind, entityId, token })),
      skipDuplicates: true,
    });
  }

  async findIds(userId: string, dek: Buffer, query: string, kind: string): Promise<string[] | null> {
    const tokens = blindTokens(dek, query);
    if (!tokens.length) return null;
    const rows = await this.kernel.prisma.searchBlind.findMany({
      where: { userId, kind, token: { in: tokens } },
      select: { entityId: true },
    });
    return [...new Set(rows.map((row) => row.entityId))];
  }
}
