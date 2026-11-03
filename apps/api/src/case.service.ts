import { Injectable } from "@nestjs/common";
import { caseHealthScore } from "./domain/case-health";
import { pageMeta, pageQuery } from "./domain/paging";
import { fail } from "./http-error";
import { Kernel } from "./kernel";

@Injectable()
export class CaseService {
  constructor(private readonly kernel: Kernel) {}

  async list(userId: string, dek: Buffer, pageRaw?: string, takeRaw?: string) {
    const { page, take, skip } = pageQuery(pageRaw, takeRaw);
    const where = { userId };
    const [total, rows] = await Promise.all([
      this.kernel.prisma.caseFile.count({ where }),
      this.kernel.prisma.caseFile.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take }),
    ]);
    return {
      cases: rows.map((row) => ({
        id: row.id,
        title: this.kernel.dec(dek, row.titleEnc),
        court: row.court,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
      })),
      ...pageMeta(total, page, take),
    };
  }

  async documents(userId: string) {
    const rows = await this.kernel.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, filename: true, byteSize: true, mime: true, caseId: true, createdAt: true },
    });
    return { documents: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })) };
  }

  async health(userId: string, dek: Buffer, caseId: string) {
    const row = await this.kernel.prisma.caseFile.findFirst({
      where: { id: caseId, userId },
      include: { documents: true, memos: { include: { citations: true } }, hearings: true },
    });
    if (!row) fail("NOT_FOUND", 404, "Case was not found");
    const notes = JSON.parse((row.notesEnc ? this.kernel.dec(dek, row.notesEnc) : "{}") || "{}") as { plaintiff?: string; defendant?: string };
    const parties = Number(Boolean(notes.plaintiff)) + Number(Boolean(notes.defendant));
    const citations = row.memos.reduce((sum, memo) => sum + memo.citations.length, 0);
    const facts = this.kernel.dec(dek, row.titleEnc).length;
    return {
      score: caseHealthScore({ facts, parties, documents: row.documents.length, citations }),
      hearings: row.hearings.length,
    };
  }
}
