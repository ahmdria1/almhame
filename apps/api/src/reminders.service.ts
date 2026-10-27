import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { Kernel } from "./kernel";

@Injectable()
export class ReminderService implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly kernel: Kernel) {}

  async onModuleInit() {
    if (!this.kernel.config.redisUrl || process.env.NODE_ENV === "test") return;
    try {
      const connection = { url: this.kernel.config.redisUrl, maxRetriesPerRequest: null as null };
      this.queue = new Queue("reminders", { connection });
      this.worker = new Worker(
        "reminders",
        async (job) => {
          await this.dispatch(String(job.data.hearingId));
        },
        { connection },
      );
    } catch {
      this.queue = undefined;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async schedule(hearingId: string, reminderAt: Date) {
    if (!this.queue) return;
    const delay = Math.max(0, reminderAt.getTime() - Date.now());
    await this.queue.add("remind", { hearingId }, { delay, jobId: hearingId, removeOnComplete: 100 });
  }

  async dispatch(hearingId: string) {
    const hearing = await this.kernel.prisma.hearing.findUnique({ where: { id: hearingId } });
    if (!hearing || hearing.remindedAt) return;
    const user = await this.kernel.prisma.user.findUnique({ where: { id: hearing.userId } });
    if (!user?.notifyHearings) {
      await this.kernel.prisma.hearing.update({ where: { id: hearingId }, data: { remindedAt: new Date() } });
      return;
    }
    const updated = await this.kernel.prisma.hearing.updateMany({
      where: { id: hearingId, remindedAt: null },
      data: { remindedAt: new Date() },
    });
    if (updated.count === 0) return;
    await this.kernel.prisma.notification.create({ data: { userId: hearing.userId, hearingId } });
  }

  async sweep() {
    const due = await this.kernel.prisma.hearing.findMany({
      where: { remindedAt: null, reminderAt: { lte: new Date() } },
      take: 50,
    });
    for (const row of due) await this.dispatch(row.id);
  }
}
