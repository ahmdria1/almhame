import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { mailLocale, sendAuthMail } from "./mail";
import { Kernel } from "./kernel";

@Injectable()
export class WeeklyService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly kernel: Kernel) {}

  onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => {
      void this.sendDue();
    }, 7 * 24 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async digestCounts(userId: string) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [memos, hearings] = await Promise.all([
      this.kernel.prisma.memo.count({ where: { userId, createdAt: { gte: since } } }),
      this.kernel.prisma.hearing.count({ where: { userId, occursAt: { gte: since } } }),
    ]);
    return { memos, hearings };
  }

  async sendDue() {
    const users = await this.kernel.prisma.user.findMany({
      where: { emailVerifiedAt: { not: null } },
      select: { id: true, email: true, locale: true },
      take: 50,
    });
    for (const user of users) {
      const counts = await this.digestCounts(user.id);
      if (counts.memos === 0 && counts.hearings === 0) continue;
      await sendAuthMail(this.kernel.config, {
        to: user.email,
        code: "",
        purpose: "weekly_digest",
        link: "",
        locale: mailLocale(user.locale),
        memos: counts.memos,
        hearings: counts.hearings,
      });
    }
    return { sent: users.length };
  }
}
