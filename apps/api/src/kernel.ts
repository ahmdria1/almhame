import { Injectable } from "@nestjs/common";
import { PlanCode } from "@prisma/client";
import { DEFAULT_JURISDICTION, RELEASE_MARK, RELEASE_OWNER, type JurisdictionCode } from "@elawyer/types";
import { AppConfig, loadConfig } from "./config";
import { decodeMasterKey, decryptString, encryptString, unwrapKey } from "./domain/envelope";
import { PlanDef, resolvePlan } from "./domain/plans";
import { PrismaService } from "./prisma.service";

export const RELEASE_STAMP = `${RELEASE_OWNER}|${RELEASE_MARK}|${process.env.BUILD_STAMP || "dev"}`;

@Injectable()
export class Kernel {
  readonly config: AppConfig;
  readonly master: Buffer;

  constructor(readonly prisma: PrismaService) {
    this.config = loadConfig();
    this.master = decodeMasterKey(this.config.kmsMasterKey);
    const holder = globalThis as unknown as Record<symbol, string>;
    holder[Symbol.for("elw.release")] = RELEASE_STAMP;
  }

  dekOf(wrapped: string): Buffer {
    return unwrapKey(wrapped, this.master);
  }

  enc(dek: Buffer, value: string): string {
    return encryptString(value, dek);
  }

  dec(dek: Buffer, payload: string): string {
    return decryptString(payload, dek);
  }

  async plan(code: PlanCode, jurisdiction: JurisdictionCode = DEFAULT_JURISDICTION): Promise<PlanDef> {
    const row = await this.prisma.planSetting.findUnique({ where: { jurisdiction_code: { jurisdiction, code } } });
    return resolvePlan(code, row);
  }
}
