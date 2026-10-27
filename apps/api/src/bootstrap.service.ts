import { Injectable, OnModuleInit } from "@nestjs/common";
import { COURTS, DEFAULT_JURISDICTION, JURISDICTION_CATALOG, MEMO_TYPES } from "@elawyer/types";
import { COURT_HEADING, MEMO_TITLE } from "./domain/draft";
import { PLAN_DEFS } from "./domain/plans";
import { Kernel } from "./kernel";

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(private readonly kernel: Kernel) {}

  async onModuleInit() {
    const place = JURISDICTION_CATALOG[DEFAULT_JURISDICTION];
    await this.kernel.prisma.jurisdiction.upsert({
      where: { code: place.code },
      update: {},
      create: { code: place.code, currency: place.currency, minorPerUnit: place.minorPerUnit, vatRateBps: place.vatRateBps },
    });
    for (const code of COURTS) {
      await this.kernel.prisma.court.upsert({
        where: { jurisdiction_code: { jurisdiction: place.code, code } },
        update: {},
        create: { jurisdiction: place.code, code },
      });
    }
    for (const memoType of MEMO_TYPES) {
      await this.kernel.prisma.documentTemplate.upsert({
        where: { jurisdiction_memoType: { jurisdiction: place.code, memoType } },
        update: {},
        create: { jurisdiction: place.code, memoType, titleAr: MEMO_TITLE[memoType], courtHeadings: COURT_HEADING },
      });
    }
    for (const plan of Object.values(PLAN_DEFS)) {
      await this.kernel.prisma.planSetting.upsert({
        where: { jurisdiction_code: { jurisdiction: plan.jurisdiction, code: plan.code } },
        update: {},
        create: {
          jurisdiction: plan.jurisdiction,
          code: plan.code,
          priceHalalas: plan.priceHalalas,
          currency: plan.currency,
          memoLimit: plan.memoLimit,
          chatLimit: plan.chatLimit,
          courts: plan.courts,
        },
      });
    }
  }
}
