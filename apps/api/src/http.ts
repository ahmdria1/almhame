import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtService } from "@nestjs/jwt";
import { Throttle } from "@nestjs/throttler";
import { Equals, IsEmail, IsIn, IsOptional, IsString, Length } from "class-validator";
import type { Request, Response } from "express";
import { PlanCode } from "@prisma/client";
import { COURTS, MEMO_TYPES, PLAN_CODES } from "@elawyer/types";
import { AdminService } from "./admin.service";
import { AuthService } from "./auth.service";
import { BillingService } from "./billing.service";
import { CorpusService } from "./corpus.service";
import { fail } from "./http-error";
import { Kernel } from "./kernel";
import { WorkService } from "./work.service";

export class SignupDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsString()
  @Length(8, 20)
  phone!: string;

  @IsEmail()
  email!: string;

  @Equals(true)
  consent!: boolean;
}

export class LoginDto {
  @IsString()
  @Length(3, 120)
  identifier!: string;
}

export class VerifyDto {
  @IsString()
  challengeId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class MessageDto {
  @IsString()
  @Length(1, 8000)
  text!: string;
}

export class DraftDto {
  @IsOptional()
  payPerMemo?: boolean;
}

export class CheckoutDto {
  @IsIn(["topup", "subscription"])
  purpose!: "topup" | "subscription";

  @IsOptional()
  amountHalalas?: number;

  @IsOptional()
  @IsIn(PLAN_CODES)
  planCode?: PlanCode;

  @IsOptional()
  @IsIn(["monthly", "yearly"])
  cycle?: "monthly" | "yearly";

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

function refreshCookie(res: Response, token: string, secure: boolean) {
  res.cookie("elw_refresh", token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/api/auth",
    maxAge: 30 * 24 * 3600 * 1000,
  });
}

async function userIdFrom(jwt: JwtService, req: Request) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) fail("UNAUTHENTICATED", 401, "Sign in");
  try {
    const payload = await jwt.verifyAsync<{ sub: string; role: string }>(token);
    if (payload.role !== "user") fail("UNAUTHENTICATED", 401, "Sign in");
    return payload.sub;
  } catch {
    fail("UNAUTHENTICATED", 401, "Sign in");
  }
}

async function adminIdFrom(jwt: JwtService, req: Request) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) fail("UNAUTHENTICATED", 401, "Sign in");
  try {
    const payload = await jwt.verifyAsync<{ sub: string; role: string }>(token);
    if (payload.role !== "admin") fail("UNAUTHENTICATED", 401, "Sign in");
    return payload.sub;
  } catch {
    fail("UNAUTHENTICATED", 401, "Sign in");
  }
}

@Controller("health")
export class HealthController {
  constructor(private readonly kernel: Kernel) {}

  @Get()
  async health() {
    await this.kernel.prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  }
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly kernel: Kernel,
  ) {}

  @Post("signup")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  signup(@Body() body: SignupDto) {
    return this.auth.signup(body);
  }

  @Post("login")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  login(@Body() body: LoginDto) {
    return this.auth.login(body.identifier);
  }

  @Post("verify")
  async verify(@Body() body: VerifyDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.verify(body.challengeId, body.code);
    refreshCookie(res, result.refreshToken, this.kernel.config.nodeEnv === "production");
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.refresh(req.cookies?.elw_refresh || "");
    refreshCookie(res, result.refreshToken, this.kernel.config.nodeEnv === "production");
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.elw_refresh || "");
    res.clearCookie("elw_refresh", { path: "/api/auth" });
    return { ok: true };
  }
}

@Controller()
export class ProductController {
  constructor(
    private readonly work: WorkService,
    private readonly billing: BillingService,
    private readonly jwt: JwtService,
  ) {}

  @Get("me")
  async me(@Req() req: Request) {
    return { user: await this.work.account(await userIdFrom(this.jwt, req)) };
  }

  @Patch("me")
  async updateMe(@Req() req: Request, @Body() body: { name?: string; locale?: string; theme?: string; notifyHearings?: boolean }) {
    return { user: await this.work.updateAccount(await userIdFrom(this.jwt, req), body) };
  }

  @Get("me/export")
  async exportMe(@Req() req: Request) {
    return this.work.exportAccount(await userIdFrom(this.jwt, req));
  }

  @Delete("me")
  async deleteMe(@Req() req: Request, @Body() body: { confirm?: boolean }) {
    if (body?.confirm !== true) fail("VALIDATION", 400, "Confirm account deletion");
    return this.work.deleteAccount(await userIdFrom(this.jwt, req));
  }

  @Get("me/notifications")
  async notifications(@Req() req: Request) {
    return { items: await this.work.notifications(await userIdFrom(this.jwt, req)) };
  }

  @Post("me/notifications/:id/read")
  async readNotification(@Req() req: Request, @Param("id") id: string) {
    return this.work.markNotification(await userIdFrom(this.jwt, req), id);
  }

  @Get("plans")
  plans() {
    return this.billing.plans();
  }

  @Get("chats")
  async chats(@Req() req: Request) {
    return { chats: await this.work.listChats(await userIdFrom(this.jwt, req)) };
  }

  @Post("chats")
  async createChat(@Req() req: Request, @Body() body: { court?: string; memoType?: string; title?: string }) {
    if (!body.court || !COURTS.includes(body.court as (typeof COURTS)[number])) fail("VALIDATION", 400, "Court is required");
    if (!body.memoType || !MEMO_TYPES.includes(body.memoType as (typeof MEMO_TYPES)[number])) fail("VALIDATION", 400, "Memo type is required");
    return {
      chat: await this.work.createChat(await userIdFrom(this.jwt, req), {
        court: body.court as (typeof COURTS)[number],
        memoType: body.memoType as (typeof MEMO_TYPES)[number],
        title: body.title,
      }),
    };
  }

  @Get("chats/:id")
  async chat(@Req() req: Request, @Param("id") id: string) {
    return this.work.getChat(await userIdFrom(this.jwt, req), id);
  }

  @Post("chats/:id/messages")
  async message(@Req() req: Request, @Param("id") id: string, @Body() body: MessageDto) {
    return this.work.sendMessage(await userIdFrom(this.jwt, req), id, body.text);
  }

  @Post("chats/:id/draft")
  async draft(@Req() req: Request, @Param("id") id: string, @Body() body: DraftDto) {
    return { memo: await this.work.draft(await userIdFrom(this.jwt, req), id, Boolean(body?.payPerMemo)) };
  }

  @Get("memos")
  async memos(@Req() req: Request) {
    return { memos: await this.work.listMemos(await userIdFrom(this.jwt, req)) };
  }

  @Get("memos/:id")
  async memo(@Req() req: Request, @Param("id") id: string) {
    return { memo: await this.work.getMemo(await userIdFrom(this.jwt, req), id) };
  }

  @Patch("memos/:id")
  async updateMemo(@Req() req: Request, @Param("id") id: string, @Body() body: { title?: string; body?: string }) {
    return { memo: await this.work.updateMemo(await userIdFrom(this.jwt, req), id, body) };
  }

  @Get("memos/:id/export.pdf")
  async exportPdf(@Req() req: Request, @Param("id") id: string, @Res() res: Response) {
    const file = await this.work.exportMemo(await userIdFrom(this.jwt, req), id, "pdf");
    sendFile(res, file);
  }

  @Get("memos/:id/export.docx")
  async exportDocx(@Req() req: Request, @Param("id") id: string, @Res() res: Response) {
    const file = await this.work.exportMemo(await userIdFrom(this.jwt, req), id, "docx");
    sendFile(res, file);
  }

  @Get("wallet")
  async wallet(@Req() req: Request) {
    return this.work.wallet(await userIdFrom(this.jwt, req));
  }

  @Post("billing/checkout")
  async checkout(@Req() req: Request, @Body() body: CheckoutDto, @Headers("idempotency-key") key?: string) {
    return this.billing.checkout(await userIdFrom(this.jwt, req), { ...body, idempotencyKey: body.idempotencyKey || key });
  }

  @Get("saved")
  async saved(@Req() req: Request) {
    return { items: await this.work.saved(await userIdFrom(this.jwt, req)) };
  }

  @Post("saved")
  async save(@Req() req: Request, @Body() body: { kind?: string; memoId?: string; articleId?: string; shariaId?: string }) {
    if (!body.kind) fail("VALIDATION", 400, "Kind is required");
    return this.work.saveItem(await userIdFrom(this.jwt, req), { kind: body.kind, memoId: body.memoId, articleId: body.articleId, shariaId: body.shariaId });
  }

  @Delete("saved/:id")
  async unsave(@Req() req: Request, @Param("id") id: string) {
    return this.work.unsave(await userIdFrom(this.jwt, req), id);
  }

  @Get("search")
  async search(@Req() req: Request, @Query("q") q = "") {
    return this.work.search(await userIdFrom(this.jwt, req), q);
  }

  @Get("cases")
  async cases(@Req() req: Request) {
    return { cases: await this.work.listCases(await userIdFrom(this.jwt, req)) };
  }

  @Get("cases/:id")
  async caseFile(@Req() req: Request, @Param("id") id: string) {
    return { caseFile: await this.work.getCase(await userIdFrom(this.jwt, req), id) };
  }

  @Post("cases/:id/documents")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 15 * 1024 * 1024 } }))
  async upload(@Req() req: Request, @Param("id") id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) fail("VALIDATION", 400, "Choose a file");
    return this.work.upload(await userIdFrom(this.jwt, req), id, file);
  }

  @Get("documents/:id/download")
  async download(@Req() req: Request, @Param("id") id: string, @Res() res: Response) {
    const file = await this.work.download(await userIdFrom(this.jwt, req), id);
    sendFile(res, file);
  }

  @Post("cases/:id/hearings")
  async hearing(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { kind?: "hearing" | "objection_deadline"; occursAt?: string; title?: string },
  ) {
    if (!body.occursAt || (body.kind !== "hearing" && body.kind !== "objection_deadline")) {
      fail("VALIDATION", 400, "Hearing kind and date are required");
    }
    return this.work.addHearing(await userIdFrom(this.jwt, req), id, { kind: body.kind, occursAt: body.occursAt, title: body.title || "" });
  }

  @Get("cases/:id/hearings.ics")
  async ics(@Req() req: Request, @Param("id") id: string, @Res() res: Response) {
    const text = await this.work.ics(await userIdFrom(this.jwt, req), id);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.send(text);
  }

  @Get("integrations")
  async integrations(@Req() req: Request) {
    return { items: await this.work.integrations(await userIdFrom(this.jwt, req)) };
  }

  @Post("integrations/:provider/start")
  async startIntegration(@Req() req: Request, @Param("provider") provider: string) {
    return this.work.startIntegration(await userIdFrom(this.jwt, req), provider);
  }

  @Get("integrations/:provider/callback")
  async callback(@Param("provider") provider: string, @Query("code") code = "", @Query("state") state = "") {
    return this.work.integrationCallback(provider, code, state);
  }

  @Post("integrations/google_drive/export")
  async exportDrive(@Req() req: Request, @Body() body: { memoId?: string }) {
    if (!body.memoId) fail("VALIDATION", 400, "Memo is required");
    return this.work.exportDrive(await userIdFrom(this.jwt, req), body.memoId);
  }

  @Get("org")
  async org(@Req() req: Request) {
    return { org: await this.work.org(await userIdFrom(this.jwt, req)) };
  }

  @Patch("org")
  async updateOrg(@Req() req: Request, @Body() body: { name?: string; letterheadName?: string }) {
    return this.work.updateOrg(await userIdFrom(this.jwt, req), body);
  }

  @Post("org/members")
  async member(@Req() req: Request, @Body() body: { name?: string; phone?: string; email?: string; consent?: boolean }) {
    if (!body.name || !body.phone || !body.email) fail("VALIDATION", 400, "Member details are required");
    return this.work.addMember(await userIdFrom(this.jwt, req), {
      name: body.name,
      phone: body.phone,
      email: body.email,
      consent: body.consent === true,
    });
  }
}

@Controller("payments")
export class PaymentController {
  constructor(
    private readonly billing: BillingService,
    private readonly kernel: Kernel,
  ) {}

  @Post("confirm")
  confirm(@Body() body: { intentId?: string; sig?: string }) {
    if (!body.intentId || !body.sig) fail("VALIDATION", 400, "Payment confirmation is incomplete");
    return this.billing.confirmSandbox(body.intentId, body.sig);
  }

  @Post("webhook")
  webhook(@Body() body: { intentId?: string; status?: string; eventKey?: string }, @Headers("x-signature") signature = "") {
    return this.billing.webhook(body, signature);
  }

  @Post("callback")
  async callback(@Body() body: Record<string, string>, @Res() res: Response) {
    const result = await this.billing.gatewayCallback(body);
    res.redirect(`${this.kernel.config.webOrigin}/pay/result?status=${result.status}`);
  }

  @Get("redirect/:id")
  async redirect(@Param("id") id: string, @Res() res: Response) {
    const html = await this.billing.hostedForm(id);
    res.type("html").send(html);
  }
}

@Controller("admin")
export class AdminController {
  constructor(
    private readonly auth: AuthService,
    private readonly admin: AdminService,
    private readonly corpus: CorpusService,
    private readonly jwt: JwtService,
  ) {}

  @Post("login")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) fail("VALIDATION", 400, "Email and password are required");
    return this.auth.adminLogin(body.email, body.password);
  }

  @Get("stats")
  async stats(@Req() req: Request) {
    await adminIdFrom(this.jwt, req);
    return this.admin.stats();
  }

  @Get("corpus")
  async corpusSummary(@Req() req: Request) {
    await adminIdFrom(this.jwt, req);
    return this.corpus.counts();
  }

  @Post("corpus/import")
  async importCorpus(@Req() req: Request, @Body() body: unknown, @Headers("content-type") contentType = "", @Query("confirmOfficial") confirm = "") {
    await adminIdFrom(this.jwt, req);
    const raw = typeof body === "string" ? body : JSON.stringify(body ?? {});
    const parsed = this.corpus.parseImport(raw, contentType, confirm === "true");
    return this.corpus.importRecords(parsed);
  }
}

function sendFile(res: Response, file: { filename: string; mime: string; bytes: Buffer }) {
  const ascii = file.filename.replace(/[^\w. -]+/g, "") || "download";
  res.setHeader("Content-Type", file.mime);
  res.setHeader("Content-Disposition", `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
  res.send(file.bytes);
}
