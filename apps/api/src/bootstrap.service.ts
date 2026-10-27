import { Injectable, OnModuleInit } from "@nestjs/common";
import { PLAN_DEFS } from "./domain/plans";
import { Kernel } from "./kernel";

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(private readonly kernel: Kernel) {}

  async onModuleInit() {
    for (const plan of Object.values(PLAN_DEFS)) {
      await this.kernel.prisma.planSetting.upsert({
        where: { code: plan.code },
        update: {},
        create: {
          code: plan.code,
          priceHalalas: plan.priceHalalas,
          memoLimit: plan.memoLimit,
          chatLimit: plan.chatLimit,
        },
      });
    }
  }
}
