import { HttpException } from "@nestjs/common";
import { CaseAlertService } from "./case-alert.service";
import type { AppConfig } from "./config";
import type { Kernel } from "./kernel";

function config(): AppConfig {
  return {
    najizBaseUrl: "",
    najizClientId: "",
    najizClientSecret: "",
    najizCallbackSecret: "",
    najizTokenPath: "",
    najizCaseQueryPath: "",
  } as AppConfig;
}

describe("case alert privacy", () => {
  it("reads a case only for the signed-in owner", async () => {
    let where: { id?: string; userId?: string } = {};
    const service = new CaseAlertService({
      config: config(),
      dekOf: () => Buffer.alloc(32),
      prisma: {
        trackedCase: {
          findFirst: async (args: { where: { id: string; userId: string } }) => {
            where = args.where;
            return null;
          },
        },
      },
    } as unknown as Kernel);
    await expect(service.detail("user-a", Buffer.alloc(32), "case-1")).rejects.toBeInstanceOf(HttpException);
    expect(where).toEqual({ id: "case-1", userId: "user-a" });
  });

  it("lists only that owner's cases and stays disconnected without Najiz", async () => {
    let where: { userId?: string } = {};
    const service = new CaseAlertService({
      config: config(),
      dekOf: () => Buffer.alloc(32),
      prisma: {
        trackedCase: {
          findMany: async (args: { where?: { userId: string } }) => {
            if (args.where) where = args.where;
            return [];
          },
        },
      },
    } as unknown as Kernel);
    await expect(service.list("user-b", Buffer.alloc(32))).resolves.toEqual({ connected: false, cases: [] });
    expect(where).toEqual({ userId: "user-b" });
    await expect(service.pollOnce()).resolves.toEqual({ connected: false, checked: 0 });
  });
});
