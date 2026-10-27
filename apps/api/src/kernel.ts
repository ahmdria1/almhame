import { Injectable } from "@nestjs/common";
import { RELEASE_MARK, RELEASE_OWNER } from "@elawyer/types";
import { AppConfig, loadConfig } from "./config";
import { decodeMasterKey, decryptString, encryptString, unwrapKey } from "./domain/envelope";
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
}
