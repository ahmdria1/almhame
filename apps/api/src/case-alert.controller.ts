import { Body, Controller, Get, Headers, Param, Patch, Post, Req } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { canonicalFiling } from "./domain/najiz";
import { CaseAlertService } from "./case-alert.service";
import { userIdFrom } from "./http";
import { Kernel } from "./kernel";

@Controller()
export class CaseAlertController {
  constructor(
    private readonly alerts: CaseAlertService,
    private readonly kernel: Kernel,
    private readonly jwt: JwtService,
  ) {}

  @Get("tracked")
  async list(@Req() req: Request) {
    const userId = await userIdFrom(this.jwt, req);
    const user = await this.kernel.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { connected: this.alerts.connected, cases: [] };
    return this.alerts.list(userId, this.kernel.dekOf(user.wrappedDataKey));
  }

  @Post("tracked")
  async add(@Req() req: Request, @Body() body: { caseNumber?: string; court?: string; role?: string }) {
    const userId = await userIdFrom(this.jwt, req);
    const user = await this.kernel.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { connected: false };
    return this.alerts.add(userId, this.kernel.dekOf(user.wrappedDataKey), body);
  }

  @Get("tracked/:id")
  async detail(@Req() req: Request, @Param("id") id: string) {
    const userId = await userIdFrom(this.jwt, req);
    const user = await this.kernel.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { connected: false };
    return this.alerts.detail(userId, this.kernel.dekOf(user.wrappedDataKey), id);
  }

  @Get("tracked-settings")
  settings(@Req() req: Request) {
    return userIdFrom(this.jwt, req).then((userId) => this.alerts.preferences(userId));
  }

  @Patch("tracked-settings")
  saveSettings(@Req() req: Request, @Body() body: { inApp?: boolean; email?: boolean; sms?: boolean }) {
    return userIdFrom(this.jwt, req).then((userId) => this.alerts.savePreferences(userId, body));
  }

  @Post("najiz/callback")
  callback(
    @Headers("x-najiz-signature") signature = "",
    @Body() body: { caseNumber?: string; court?: string; externalId?: string; title?: string; filer?: string; filedAt?: string; responseDeadline?: string | null },
  ) {
    const payload = body.caseNumber && body.court && body.externalId && body.title && body.filer && body.filedAt
      ? canonicalFiling({
        caseNumber: body.caseNumber,
        court: body.court,
        externalId: body.externalId,
        title: body.title,
        filer: body.filer,
        filedAt: body.filedAt,
        responseDeadline: body.responseDeadline,
      })
      : "";
    return this.alerts.acceptCallback(payload, signature, body);
  }
}
