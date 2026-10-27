import { Injectable } from "@nestjs/common";
import { CorpusService } from "./corpus.service";
import { Kernel } from "./kernel";

@Injectable()
export class AdminService {
  constructor(
    private readonly kernel: Kernel,
    private readonly corpus: CorpusService,
  ) {}

  async stats() {
    const [users, revenue, memoGroups, planGroups, corpus] = await Promise.all([
      this.kernel.prisma.user.count(),
      this.kernel.prisma.invoice.aggregate({ _sum: { totalHalalas: true } }),
      this.kernel.prisma.memo.groupBy({ by: ["court"], _count: { _all: true } }),
      this.kernel.prisma.user.groupBy({ by: ["planCode"], _count: { _all: true } }),
      this.corpus.counts(),
    ]);
    const activeSubscriptions = planGroups
      .filter((row) => row.planCode !== "free")
      .reduce((sum, row) => sum + row._count._all, 0);
    return {
      users,
      activeSubscriptions,
      revenueHalalas: revenue._sum.totalHalalas || 0,
      memos: memoGroups.reduce((sum, row) => sum + row._count._all, 0),
      memosByCourt: Object.fromEntries(memoGroups.map((row) => [row.court, row._count._all])),
      subscriptionsByPlan: Object.fromEntries(planGroups.map((row) => [row.planCode, row._count._all])),
      corpus,
    };
  }
}
