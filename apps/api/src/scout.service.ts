import { Injectable } from "@nestjs/common";
import { officialTitle } from "./domain/sms-provider";
import { Kernel } from "./kernel";

@Injectable()
export class ScoutService {
  constructor(private readonly kernel: Kernel) {}

  async list() {
    const rows = await this.kernel.prisma.pendingUpdate.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return rows.map((row) => ({
      id: row.id,
      lawKey: row.lawKey,
      sourceUrl: row.sourceUrl,
      note: row.note,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async scan(lawKey: string) {
    const law = await this.kernel.prisma.law.findFirst({ where: { key: lawKey } });
    if (!law) return { flagged: 0 };
    let note = "تعذر قراءة الصفحة الرسمية";
    try {
      const response = await fetch(law.sourceUrl, { signal: AbortSignal.timeout(8000) });
      const html = await response.text();
      const title = officialTitle(html).slice(0, 180);
      note = title && !title.includes(law.nameAr) ? `العنوان الظاهر: ${title}` : "الصفحة الرسمية ما زالت تحمل اسم النظام المحفوظ";
    } catch {
      note = "تعذر قراءة الصفحة الرسمية";
    }
    await this.kernel.prisma.pendingUpdate.create({
      data: { lawKey: law.key, sourceUrl: law.sourceUrl, note, status: "pending" },
    });
    return { flagged: 1 };
  }
}
