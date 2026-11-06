import { execFile } from "child_process";
import { randomUUID, timingSafeEqual } from "crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";
import { Injectable, Logger } from "@nestjs/common";
import * as Sentry from "@sentry/node";
import { IntegrationProvider, MemoType, Prisma, User } from "@prisma/client";
import { jurisdictionOf, priceForMemoType, type CourtType as Court, type MemoType as MemoKind, type PlanCode } from "@elawyer/types";
import { CorpusService } from "./corpus.service";
import { InfectedUpload, scanInstream } from "./domain/clamd";
import { knownArticle, textHash, validateCitations, type CitationRef } from "./domain/citations";
import { COURT_HEADING, readSlots } from "./domain/draft";
import { draftCheckRecord, draftPrompt, humanMemo, reviewModelDraft, type DraftCheckRecord, type DraftPacket } from "./domain/draft-guard";
import { decryptBytes, encryptBytes } from "./domain/envelope";
import { halalasToSar, nextInvoiceNumber, splitVatInclusive, zatcaQrBase64 } from "./domain/invoice";
import { estimateTokens, readGeneric, routeModel, writeGeneric, type RouteDecision } from "./domain/model-route";
import { verifierModel } from "./domain/sms-provider";
import { chatQuota, chatsCounted, courtAllowed, memoQuota } from "./domain/plans";
import { signSandbox } from "./domain/payments";
import { inspectPdf, kindFromMime, MAX_UPLOAD_BYTES, reencodeImage, sanitizeFilename, sniffUpload, takeUploadSlot } from "./domain/uploads";
import { fail } from "./http-error";
import { CacheService } from "./cache.service";
import { CaseService } from "./case.service";
import { ChatService } from "./chat.service";
import { Kernel } from "./kernel";
import { MemoService } from "./memo.service";
import { ReferralService } from "./referral.service";
import { SearchService } from "./search.service";
import { presentUser } from "./present";
import { ReminderService } from "./reminders.service";
import { fontFile, renderDocx, renderPdf } from "./render";

const exec = promisify(execFile);

@Injectable()
export class WorkService {
  private readonly logger = new Logger(WorkService.name);
  private readonly uploadStamps = new Map<string, number[]>();

  constructor(
    private readonly kernel: Kernel,
    private readonly corpus: CorpusService,
    private readonly reminders: ReminderService,
    private readonly cache: CacheService,
    private readonly searchIndex: SearchService,
    private readonly chats: ChatService,
    private readonly memos: MemoService,
    private readonly cases: CaseService,
    private readonly referrals: ReferralService,
  ) {}

  async account(userId: string) {
    const cached = await this.cache.get(userId);
    if (cached) return JSON.parse(cached) as ReturnType<typeof presentUser>;
    const user = await this.fresh(userId);
    const view = presentUser(user, await this.kernel.plan(user.planCode, jurisdictionOf(user.jurisdiction).code));
    await this.cache.set(userId, JSON.stringify(view));
    return view;
  }

  async updateAccount(userId: string, input: { name?: string; locale?: string; theme?: string; notifyHearings?: boolean }) {
    const data: Prisma.UserUpdateInput = {};
    if (input.name) data.name = input.name.trim().slice(0, 80);
    if (input.locale) data.locale = input.locale.slice(0, 8);
    if (input.theme === "light" || input.theme === "dark") data.theme = input.theme;
    if (typeof input.notifyHearings === "boolean") data.notifyHearings = input.notifyHearings;
    const user = await this.kernel.prisma.user.update({ where: { id: userId }, data });
    await this.cache.drop(userId);
    return presentUser(user, await this.kernel.plan(user.planCode, jurisdictionOf(user.jurisdiction).code));
  }

  async exportAccount(userId: string) {
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const chats = await this.kernel.prisma.chat.findMany({
      where: { userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    const memos = await this.kernel.prisma.memo.findMany({ where: { userId } });
    const documents = await this.kernel.prisma.document.findMany({ where: { userId } });
    return {
      profile: presentUser(user, await this.kernel.plan(user.planCode, jurisdictionOf(user.jurisdiction).code)),
      chats: chats.map((chat) => ({
        id: chat.id,
        title: this.kernel.dec(dek, chat.titleEnc),
        court: chat.court,
        memoType: chat.memoType,
        messages: chat.messages.map((message) => ({
          role: message.role,
          content: this.kernel.dec(dek, message.contentEnc),
          createdAt: message.createdAt,
        })),
      })),
      memos: memos.map((memo) => ({
        id: memo.id,
        title: this.kernel.dec(dek, memo.titleEnc),
        body: this.kernel.dec(dek, memo.bodyEnc),
        court: memo.court,
        memoType: memo.memoType,
      })),
      documents: documents.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        text: doc.ocrEnc ? this.kernel.dec(dek, doc.ocrEnc) : "",
      })),
    };
  }

  async deleteAccount(userId: string) {
    await rm(path.join(this.kernel.config.storageDir, userId), { recursive: true, force: true });
    await this.kernel.prisma.$transaction(async (tx) => {
      const owned = await tx.organization.findUnique({ where: { ownerId: userId } });
      if (owned) {
        await tx.user.updateMany({ where: { orgId: owned.id }, data: { orgId: null, orgRole: null } });
        await tx.organization.delete({ where: { id: owned.id } });
      }
      await tx.user.update({ where: { id: userId }, data: { orgId: null, orgRole: null } });
      await tx.user.delete({ where: { id: userId } });
    });
    return { deleted: true };
  }

  async listChats(userId: string, page?: string, take?: string) {
    const user = await this.fresh(userId);
    return this.chats.list(userId, this.kernel.dekOf(user.wrappedDataKey), page, take);
  }

  async createChat(userId: string, input: { court: Court; memoType: MemoKind; title?: string }) {
    const memoType = input.memoType as MemoType;
    const chat = await this.kernel.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) fail("NOT_FOUND", 404, "Account was not found");
      const place = jurisdictionOf(user.jurisdiction);
      const known = await tx.court.findUnique({ where: { jurisdiction_code: { jurisdiction: place.code, code: input.court } } });
      if (!known) fail("VALIDATION", 400, "Unknown court");
      const plan = await this.kernel.plan(user.planCode, place.code);
      const quota = chatQuota(plan, chatsCounted(plan, user.chatCount, user.chatCountPeriod), user.chatCredits);
      if (!quota.ok) fail("QUOTA_CHATS", 402, "The free chat limit has been reached");
      if (!courtAllowed(plan, input.court)) fail("PLAN_COURT", 403, "This court is not included in the current plan");
      const dek = this.kernel.dekOf(user.wrappedDataKey);
      const title = input.title?.trim() || "محادثة جديدة";
      await tx.user.update({
        where: { id: userId },
        data: {
          chatCount: { increment: 1 },
          ...(quota.spendCredit ? { chatCredits: { decrement: 1 } } : {}),
          ...(user.planCode === "free" ? {} : { chatCountPeriod: { increment: 1 } }),
        },
      });
      const caseFile = await tx.caseFile.create({
        data: { userId, jurisdiction: place.code, court: input.court, titleEnc: this.kernel.enc(dek, title), notesEnc: this.kernel.enc(dek, "{}") },
      });
      return tx.chat.create({
        data: { userId, caseId: caseFile.id, jurisdiction: place.code, court: input.court, memoType, titleEnc: this.kernel.enc(dek, title) },
      });
    });
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const view = this.presentChat(chat, dek);
    await this.searchIndex.index(userId, dek, "chat", view.id, view.title);
    return view;
  }

  async updateChat(userId: string, chatId: string, input: { court?: Court; memoType?: MemoKind }) {
    const user = await this.fresh(userId);
    const chat = await this.ownedChat(userId, chatId);
    const place = jurisdictionOf(user.jurisdiction);
    const court = input.court || chat.court;
    const memoType = (input.memoType || chat.memoType) as MemoKind;
    const known = await this.kernel.prisma.court.findUnique({ where: { jurisdiction_code: { jurisdiction: place.code, code: court } } });
    if (!known) fail("VALIDATION", 400, "Unknown court");
    if (!courtAllowed(await this.kernel.plan(user.planCode, place.code), court)) fail("PLAN_COURT", 403, "This court is not included in the current plan");
    const updated = await this.kernel.prisma.chat.update({
      where: { id: chat.id },
      data: { court, memoType: memoType as MemoType },
    });
    if (chat.caseId) {
      await this.kernel.prisma.caseFile.update({ where: { id: chat.caseId }, data: { court } });
    }
    return this.presentChat(updated, this.kernel.dekOf(user.wrappedDataKey));
  }

  async getChat(userId: string, chatId: string) {
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const chat = await this.ownedChat(userId, chatId);
    const messages = await this.kernel.prisma.message.findMany({ where: { chatId }, orderBy: { createdAt: "asc" } });
    const caseFile = chat.caseId
      ? await this.kernel.prisma.caseFile.findFirst({
          where: { id: chat.caseId, userId },
          include: { documents: { orderBy: { createdAt: "asc" } } },
        })
      : null;
    const notes = caseFile?.notesEnc ? JSON.parse(this.kernel.dec(dek, caseFile.notesEnc) || "{}") : {};
    return {
      chat: this.presentChat(chat, dek),
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: this.kernel.dec(dek, message.contentEnc),
        createdAt: message.createdAt.toISOString(),
      })),
      caseFile: caseFile
        ? {
            id: caseFile.id,
            title: this.kernel.dec(dek, caseFile.titleEnc),
            court: caseFile.court,
            plaintiff: notes.plaintiff || "",
            defendant: notes.defendant || "",
            documents: caseFile.documents.map((doc) => ({ id: doc.id, filename: doc.filename, byteSize: doc.byteSize })),
          }
        : null,
    };
  }

  async sendMessage(userId: string, chatId: string, text: string) {
    const clean = text.trim();
    if (clean.length < 1 || clean.length > 8000) fail("VALIDATION", 400, "Message length is invalid");
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const chat = await this.ownedChat(userId, chatId);
    const userMessage = await this.kernel.prisma.message.create({
      data: { chatId, userId, role: "user", contentEnc: this.kernel.enc(dek, clean) },
    });
    const history = await this.kernel.prisma.message.findMany({
      where: { chatId, role: "user" },
      orderBy: { createdAt: "asc" },
    });
    const texts = history.map((message) => this.kernel.dec(dek, message.contentEnc));
    const slots = readSlots(texts);
    if (slots.ready) {
      const gap = await this.corpus.governingGap(chat.court, jurisdictionOf(chat.jurisdiction).code);
      if (gap) slots.question = `${slots.question}\n${gap}`;
    }
    if (chat.caseId) {
      await this.kernel.prisma.caseFile.update({
        where: { id: chat.caseId },
        data: {
          notesEnc: this.kernel.enc(dek, JSON.stringify({ plaintiff: slots.plaintiff, defendant: slots.defendant })),
          titleEnc: texts.length === 1 ? this.kernel.enc(dek, clean.slice(0, 80)) : undefined,
        },
      });
    }
    if (texts.length === 1) {
      await this.kernel.prisma.chat.update({
        where: { id: chatId },
        data: { titleEnc: this.kernel.enc(dek, clean.slice(0, 80)), updatedAt: new Date() },
      });
    }
    const decision = await this.routeFor(user.id, user.planCode, "chat", texts.map((text) => ({ role: "user" as const, text })), 0);
    const stage = slots.ready ? "ready" : slots.facts.length < 30 ? "facts" : slots.plaintiff ? "defendant" : "plaintiff";
    const reused = readGeneric(stage) === slots.question;
    if (!reused) writeGeneric(stage, slots.question);
    const remote = await this.complete(decision);
    const counselText = remote || slots.question;
    await this.noteUsage(
      user.id,
      user.planCode,
      "chat",
      estimateTokens(decision.prefix) + estimateTokens(counselText) + estimateTokens(clean),
      decision.degraded,
      reused && !remote,
    );
    const counsel = await this.kernel.prisma.message.create({
      data: { chatId, userId, role: "counsel", contentEnc: this.kernel.enc(dek, counselText) },
    });
    return {
      readyToDraft: slots.ready,
      user: { id: userMessage.id, role: "user", content: clean, createdAt: userMessage.createdAt.toISOString() },
      counsel: { id: counsel.id, role: "counsel", content: counselText, createdAt: counsel.createdAt.toISOString() },
    };
  }

  async draft(userId: string, chatId: string, payPerMemo: boolean) {
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const chat = await this.ownedChat(userId, chatId);
    const history = await this.kernel.prisma.message.findMany({ where: { chatId, role: "user" }, orderBy: { createdAt: "asc" } });
    const texts = history.map((message) => this.kernel.dec(dek, message.contentEnc));
    const slots = readSlots(texts);
    if (texts.join("\n").trim().length < 30) fail("NEED_FACTS", 400, slots.question);
    const filled = {
      plaintiff: slots.plaintiff || "المذكور في الوقائع",
      defendant: slots.defendant || "المذكور في الوقائع",
      facts: slots.facts.length >= 30 ? slots.facts : texts.join("\n"),
      requests: slots.requests || "الحكم وفق الوقائع، مع تحميل الرسوم على المدّعى عليه.",
    };
    const place = jurisdictionOf(chat.jurisdiction);
    const template = await this.kernel.prisma.documentTemplate.findUnique({
      where: { jurisdiction_memoType: { jurisdiction: place.code, memoType: chat.memoType } },
    });
    const headings = (template?.courtHeadings || null) as Record<string, string> | null;
    const courtHeading = headings?.[chat.court];
    if (!template || !courtHeading) fail("VALIDATION", 400, "No document template for this court");
    const retrieved = await this.corpus.retrieve(chat.court, filled.facts, place.code, chat.memoType);
    const decision = await this.routeFor(
      user.id,
      user.planCode,
      "draft",
      texts.map((text) => ({ role: "user" as const, text })),
      retrieved.substantive.length + retrieved.procedural.length,
    );
    const substantive = retrieved.substantive.slice(0, decision.articleLimit);
    const procedural = (decision.degraded ? [] : retrieved.procedural).slice(0, decision.articleLimit);
    const allowed = [...substantive, ...procedural].map((article) => article.number);
    filled.facts = await this.maybeRewriteFacts(filled.facts, allowed, decision);
    const org = user.orgId ? await this.kernel.prisma.organization.findUnique({ where: { id: user.orgId } }) : null;
    const letterhead = (await this.kernel.plan(user.planCode, place.code)).letterhead ? org?.letterheadName || "" : "";
    const packet: DraftPacket = {
      court: chat.court,
      memoType: chat.memoType as MemoKind,
      slots: filled,
      articles: substantive,
      procedural,
      sharia: retrieved.sharia,
      judgments: retrieved.judgments,
      notice: retrieved.notice,
      letterhead,
      title: template.titleAr,
      courtHeading: chat.memoType === "appeal" ? COURT_HEADING.appeal : courtHeading,
    };
    let draftBody = humanMemo(packet);
    const prompt = draftPrompt(packet);
    const reminder = "لا تكتب نص مادة أو آية أو حكم. استخدم [[ref:المعرف]] فقط، ولا ترقّم الأقسام.";
    let accepted = false;
    let remoteAttempts = 0;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const turn = attempt === 1 ? prompt : `${prompt}\n${reminder}`;
      const result = await this.completeDraft({ ...decision, turns: [{ role: "user", text: turn }] });
      if (!result.called) break;
      remoteAttempts += 1;
      await this.noteUsage(user.id, user.planCode, "draft", estimateTokens(decision.prefix) + estimateTokens(turn), decision.degraded, false);
      if (!result.text) {
        await this.recordDraftCheck(draftCheckRecord({ failureType: "timeout", quoteSpan: "" }), decision.model, attempt);
        continue;
      }
      const reviewed = reviewModelDraft(result.text, packet);
      for (const failure of reviewed.failures) await this.recordDraftCheck(failure, decision.model, attempt);
      if (reviewed.ok) {
        draftBody = reviewed.draft;
        accepted = true;
        break;
      }
    }
    if (!accepted) draftBody = humanMemo(packet);
    const groundsOf = (body: string) => (body.includes("ثانيًا:") ? body.slice(body.indexOf("ثانيًا:")) : body);
    let known = await this.knownSet(draftBody.citations);
    let verdict = validateCitations(groundsOf(draftBody.body), draftBody.citations, known);
    if (!verdict.ok) {
      draftBody = humanMemo(packet);
      known = await this.knownSet(draftBody.citations);
      verdict = validateCitations(groundsOf(draftBody.body), draftBody.citations, known);
    }
    if (!verdict.ok) {
      await this.recordDraftCheck(draftCheckRecord({ failureType: "fallback", quoteSpan: verdict.unknown.join(",").slice(0, 400) }), decision.model, remoteAttempts);
      fail("DRAFT_RETRY", 503, "DRAFT_RETRY");
    }
    const memo = await this.kernel.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) fail("NOT_FOUND", 404, "Account was not found");
      const quota = memoQuota(await this.kernel.plan(current.planCode, jurisdictionOf(current.jurisdiction).code), current.memoCountPeriod);
      if (!quota.ok) {
        if (!payPerMemo) fail("QUOTA_MEMOS", 402, "The memo quota has been reached");
        const price = priceForMemoType(chat.memoType);
        const wallet = await tx.wallet.update({
          where: { userId },
          data: { balanceHalalas: { decrement: price } },
        });
        if (wallet.balanceHalalas < 0) fail("INSUFFICIENT_BALANCE", 402, "The wallet does not cover this memo");
        await tx.walletTransaction.create({
          data: {
            userId,
            type: "memo_purchase",
            amountHalalas: -price,
            idempotencyKey: `memo:${randomUUID()}`,
            description: "Single memo",
          },
        });
        await this.writeInvoice(tx, current, price, "Single memo");
      } else {
        await tx.user.update({ where: { id: userId }, data: { memoCountPeriod: { increment: 1 } } });
      }
      const created = await tx.memo.create({
        data: {
          userId,
          caseId: chat.caseId,
          chatId: chat.id,
          jurisdiction: place.code,
          court: chat.court,
          memoType: chat.memoType,
          titleEnc: this.kernel.enc(dek, draftBody.title),
          bodyEnc: this.kernel.enc(dek, draftBody.body),
          flagged: !(await this.verifyDraft(draftBody.body)),
          citations: {
            create: draftBody.citations.map((citation) =>
              citation.kind === "article" ? { articleId: citation.id } : citation.kind === "judgment" ? { judgmentId: citation.id } : { shariaId: citation.id },
            ),
          },
        },
      });
      return created;
    });
    await this.searchIndex.index(userId, dek, "memo", memo.id, draftBody.title);
    if (remoteAttempts === 0) {
      await this.noteUsage(
        userId,
        user.planCode,
        "draft",
        estimateTokens(decision.prefix) + estimateTokens(filled.facts) + allowed.length * 8,
        decision.degraded,
        false,
      );
    }
    return this.getMemo(userId, memo.id);
  }

  async listMemos(userId: string, page?: string, take?: string) {
    const user = await this.fresh(userId);
    return this.memos.list(userId, this.kernel.dekOf(user.wrappedDataKey), page, take);
  }

  async getMemo(userId: string, memoId: string) {
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const memo = await this.kernel.prisma.memo.findFirst({
      where: { id: memoId, userId },
      include: { citations: { include: { article: { include: { law: true } }, sharia: true, judgment: true } } },
    });
    if (!memo) fail("NOT_FOUND", 404, "Memo was not found");
    return {
      id: memo.id,
      title: this.kernel.dec(dek, memo.titleEnc),
      court: memo.court,
      memoType: memo.memoType,
      body: this.kernel.dec(dek, memo.bodyEnc),
      status: memo.status,
      flagged: memo.flagged,
      caseId: memo.caseId,
      chatId: memo.chatId,
      updatedAt: memo.updatedAt.toISOString(),
      citations: memo.citations.map((link) => {
        if (link.article) {
          return {
            kind: "article" as const,
            id: link.article.id,
            number: link.article.number,
            title: link.article.law.nameAr,
            excerpt: link.article.textAr,
            sourceUrl: link.article.sourceUrl,
            isSample: link.article.isSample,
            version: link.article.law.version,
            effectiveDate: link.article.law.effectiveDate ? link.article.law.effectiveDate.toISOString().slice(0, 10) : "",
            lawName: link.article.law.nameAr,
          };
        }
        if (link.judgment) {
          return {
            kind: "judgment" as const,
            id: link.judgment.id,
            number: link.judgment.judgmentNo,
            title: link.judgment.title,
            excerpt: link.judgment.fullText,
            sourceUrl: link.judgment.sourceUrl,
            isSample: link.judgment.isSample,
          };
        }
        return {
          kind: "sharia" as const,
          id: link.sharia?.id || "",
          title: link.sharia?.reference || "",
          excerpt: link.sharia?.textAr || "",
          sourceUrl: link.sharia?.sourceUrl || "",
          isSample: link.sharia?.isSample ?? true,
        };
      }),
    };
  }

  async updateMemo(userId: string, memoId: string, input: { title?: string; body?: string }) {
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const memo = await this.kernel.prisma.memo.findFirst({
      where: { id: memoId, userId },
      include: { citations: { include: { article: true, sharia: true, judgment: true } } },
    });
    if (!memo) fail("NOT_FOUND", 404, "Memo was not found");
    const body = input.body ?? this.kernel.dec(dek, memo.bodyEnc);
    const citations = memo.citations.flatMap((link): CitationRef[] => {
      if (link.article) return [{ kind: "article", id: link.article.id, number: link.article.number }];
      if (link.sharia) return [{ kind: "sharia", id: link.sharia.id }];
      if (link.judgment) return [{ kind: "judgment", id: link.judgment.id, number: link.judgment.judgmentNo }];
      return [];
    });
    const verdict = validateCitations(body, citations, await this.knownSet(citations));
    if (!verdict.ok) fail("CITATION_REJECTED", 422, verdict.unknown.join(","));
    await this.kernel.prisma.memo.update({
      where: { id: memo.id },
      data: {
        titleEnc: input.title ? this.kernel.enc(dek, input.title.slice(0, 160)) : memo.titleEnc,
        bodyEnc: this.kernel.enc(dek, body),
      },
    });
    return this.getMemo(userId, memo.id);
  }

  async exportMemo(userId: string, memoId: string, format: "pdf" | "docx", dir: "rtl" | "ltr" = "rtl") {
    const user = await this.fresh(userId);
    const plan = await this.kernel.plan(user.planCode, jurisdictionOf(user.jurisdiction).code);
    if (format === "docx" && !plan.word) {
      fail("FEATURE_WORD", 402, "Word export is not included in the current plan");
    }
    const memo = await this.getMemo(userId, memoId);
    const org = user.orgId ? await this.kernel.prisma.organization.findUnique({ where: { id: user.orgId } }) : null;
    const letterhead = plan.letterhead ? org?.letterheadName : "";
    if (format === "docx") {
      return { filename: `${memo.title}.docx`, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: await renderDocx({ title: memo.title, body: memo.body, letterhead }) };
    }
    return {
      filename: `${memo.title}.pdf`,
      mime: "application/pdf",
      bytes: await renderPdf({ title: memo.title, body: memo.body, letterhead, fontPath: fontFile(this.kernel.config.fontPath), dir }),
    };
  }

  async wallet(userId: string) {
    const wallet = await this.kernel.prisma.wallet.findUnique({ where: { userId } });
    const transactions = await this.kernel.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const invoices = await this.kernel.prisma.invoice.findMany({ where: { userId }, orderBy: { issuedAt: "desc" }, take: 50 });
    return {
      balanceHalalas: wallet?.balanceHalalas ?? 0,
      transactions: transactions.map((row) => ({
        id: row.id,
        type: row.type,
        amountHalalas: row.amountHalalas,
        description: row.description,
        createdAt: row.createdAt.toISOString(),
      })),
      invoices: invoices.map((row) => ({
        id: row.id,
        number: row.number,
        totalHalalas: row.totalHalalas,
        vatHalalas: row.vatHalalas,
        issuedAt: row.issuedAt.toISOString(),
        lineDescription: row.lineDescription,
        qrTlvBase64: row.qrTlvBase64,
      })),
    };
  }

  async saved(userId: string) {
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const items = await this.kernel.prisma.savedItem.findMany({
      where: { userId },
      include: { memo: true },
      orderBy: { createdAt: "desc" },
    });
    const result = [];
    for (const item of items) {
      if (item.kind === "memo" && item.memo) {
        result.push({ id: item.id, kind: item.kind, title: this.kernel.dec(dek, item.memo.titleEnc), refId: item.memo.id });
      } else if (item.articleId) {
        const article = await this.kernel.prisma.article.findUnique({ where: { id: item.articleId }, include: { law: true } });
        if (article) result.push({ id: item.id, kind: "article", title: `${article.law.nameAr} ${article.number}`, refId: article.id });
      } else if (item.shariaId) {
        const sharia = await this.kernel.prisma.shariaSource.findUnique({ where: { id: item.shariaId } });
        if (sharia) result.push({ id: item.id, kind: "sharia", title: sharia.reference, refId: sharia.id });
      }
    }
    return result;
  }

  async saveItem(userId: string, input: { kind: string; memoId?: string; articleId?: string; shariaId?: string }) {
    if (input.kind === "memo" && input.memoId) {
      const memo = await this.kernel.prisma.memo.findFirst({ where: { id: input.memoId, userId } });
      if (!memo) fail("NOT_FOUND", 404, "Memo was not found");
    }
    const item = await this.kernel.prisma.savedItem.create({
      data: { userId, kind: input.kind, memoId: input.memoId, articleId: input.articleId, shariaId: input.shariaId },
    });
    return { id: item.id };
  }

  async unsave(userId: string, id: string) {
    const item = await this.kernel.prisma.savedItem.findFirst({ where: { id, userId } });
    if (!item) fail("NOT_FOUND", 404, "Saved item was not found");
    await this.kernel.prisma.savedItem.delete({ where: { id } });
    return { deleted: true };
  }

  async search(userId: string, q: string) {
    const query = q.trim().slice(0, 80);
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    if (!query) {
      const chats = await this.chats.list(userId, dek, "1", "20");
      const memos = await this.memos.list(userId, dek, "1", "20");
      return { chats: chats.chats, memos: memos.memos.map((memo) => ({ id: memo.id, title: memo.title })) };
    }
    const chatIds = (await this.searchIndex.findIds(userId, dek, query, "chat")) || [];
    const memoIds = (await this.searchIndex.findIds(userId, dek, query, "memo")) || [];
    const chats = chatIds.length
      ? await this.kernel.prisma.chat.findMany({ where: { userId, id: { in: chatIds } } })
      : [];
    const memos = memoIds.length
      ? await this.kernel.prisma.memo.findMany({ where: { userId, id: { in: memoIds } } })
      : [];
    return {
      chats: chats.map((chat) => this.presentChat(chat, dek)),
      memos: memos.map((memo) => ({ id: memo.id, title: this.kernel.dec(dek, memo.titleEnc) })),
    };
  }

  async notifications(userId: string) {
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const rows = await this.kernel.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 });
    const items = [];
    for (const row of rows) {
      let title = "تذكير بموعد محفوظ";
      if (row.hearingId) {
        const hearing = await this.kernel.prisma.hearing.findFirst({ where: { id: row.hearingId, userId } });
        if (hearing) title = this.kernel.dec(dek, hearing.titleEnc);
      }
      items.push({ id: row.id, hearingId: row.hearingId, title, readAt: row.readAt?.toISOString() || null, createdAt: row.createdAt.toISOString() });
    }
    return items;
  }

  async markNotification(userId: string, id: string) {
    await this.kernel.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
    return { ok: true };
  }

  async listCases(userId: string, page?: string, take?: string) {
    const user = await this.fresh(userId);
    return this.cases.list(userId, this.kernel.dekOf(user.wrappedDataKey), page, take);
  }

  async caseHealth(userId: string, caseId: string) {
    const user = await this.fresh(userId);
    return this.cases.health(userId, this.kernel.dekOf(user.wrappedDataKey), caseId);
  }

  documents(userId: string) {
    return this.cases.documents(userId);
  }

  referral(userId: string) {
    return this.referrals.mine(userId);
  }

  claimReferral(userId: string, code: string) {
    return this.referrals.claim(userId, code);
  }

  async report(userId: string, message: string) {
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    await this.kernel.prisma.problemReport.create({
      data: { userId, messageEnc: this.kernel.enc(dek, message.trim().slice(0, 1000)) },
    });
    return { ok: true };
  }

  async acceptChunk(
    userId: string,
    caseId: string,
    chunk: { uploadId: string; index: number; total: number; name: string; mime: string; data: Buffer },
  ) {
    if (chunk.total < 1 || chunk.total > 32 || chunk.index < 0 || chunk.index >= chunk.total) fail("VALIDATION", 400, "Chunk is invalid");
    const dir = path.join(this.kernel.config.storageDir, "chunks", userId, chunk.uploadId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, String(chunk.index)), chunk.data);
    const names = await readdir(dir);
    if (names.length < chunk.total) return { received: names.length, total: chunk.total, done: false };
    const parts = await Promise.all(
      Array.from({ length: chunk.total }, (_, index) => readFile(path.join(dir, String(index)))),
    );
    const buffer = Buffer.concat(parts);
    await rm(dir, { recursive: true, force: true });
    const saved = await this.upload(userId, caseId, { buffer, mimetype: chunk.mime, originalname: chunk.name, size: buffer.length });
    return { received: chunk.total, total: chunk.total, done: true, document: saved };
  }

  async getCase(userId: string, caseId: string) {
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const row = await this.kernel.prisma.caseFile.findFirst({
      where: { id: caseId, userId },
      include: { documents: true, memos: true, hearings: { orderBy: { occursAt: "asc" } } },
    });
    if (!row) fail("NOT_FOUND", 404, "Case was not found");
    const notes = JSON.parse(this.kernel.dec(dek, row.notesEnc || this.kernel.enc(dek, "{}")) || "{}");
    return {
      id: row.id,
      title: this.kernel.dec(dek, row.titleEnc),
      court: row.court,
      notes: notes.plaintiff ? `${notes.plaintiff} / ${notes.defendant || ""}` : "",
      documents: row.documents.map((doc) => ({ id: doc.id, filename: doc.filename, byteSize: doc.byteSize })),
      memos: row.memos.map((memo) => ({
        id: memo.id,
        title: this.kernel.dec(dek, memo.titleEnc),
        memoType: memo.memoType,
        updatedAt: memo.updatedAt.toISOString(),
      })),
      hearings: row.hearings.map((hearing) => ({
        id: hearing.id,
        kind: hearing.kind,
        occursAt: hearing.occursAt.toISOString(),
        title: this.kernel.dec(dek, hearing.titleEnc),
      })),
    };
  }

  async upload(userId: string, caseId: string, file: { buffer: Buffer; mimetype: string; originalname: string; size: number }) {
    const slot = takeUploadSlot(this.uploadStamps.get(userId) || [], Date.now());
    this.uploadStamps.set(userId, slot.next);
    if (!slot.ok) fail("RATE_LIMIT", 429, "Too many uploads");
    if (file.size > MAX_UPLOAD_BYTES || file.buffer.length > MAX_UPLOAD_BYTES) fail("FILE_TOO_LARGE", 422, "File is larger than 15 MB");
    await this.scanUpload(userId, file.buffer);
    const declared = kindFromMime(file.mimetype);
    const sniffed = sniffUpload(file.buffer);
    if (!declared || sniffed !== declared) fail("UNSUPPORTED_TYPE", 422, "Upload a PDF or an image");
    let bytes = file.buffer;
    let mime = file.mimetype;
    if (sniffed === "pdf") {
      const pdf = inspectPdf(bytes);
      if ("reason" in pdf) {
        if (pdf.reason === "pages") fail("FILE_TOO_LARGE", 422, "The PDF has too many pages");
        fail("PDF_UNSAFE", 422, "The PDF was rejected");
      }
    } else {
      try {
        bytes = await reencodeImage(bytes, sniffed);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "dimensions") fail("FILE_TOO_LARGE", 422, "The image is too large");
        fail("UNSUPPORTED_TYPE", 422, "Upload a PDF or an image");
      }
      mime = sniffed === "png" ? "image/png" : sniffed === "webp" ? "image/webp" : "image/jpeg";
    }
    const filename = sanitizeFilename(file.originalname);
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const caseFile = await this.kernel.prisma.caseFile.findFirst({ where: { id: caseId, userId } });
    if (!caseFile) fail("NOT_FOUND", 404, "Case was not found");
    const text = await readUploaded(mime, bytes);
    const doc = await this.kernel.prisma.document.create({
      data: {
        userId,
        caseId,
        filename,
        mime,
        byteSize: bytes.length,
        storageKey: "pending",
        ocrEnc: text ? this.kernel.enc(dek, text) : null,
      },
    });
    const storageKey = path.join(userId, doc.id);
    await mkdir(path.join(this.kernel.config.storageDir, userId), { recursive: true });
    await writeFile(path.join(this.kernel.config.storageDir, storageKey), encryptBytes(bytes, dek));
    await this.kernel.prisma.document.update({ where: { id: doc.id }, data: { storageKey } });
    return { id: doc.id, filename: doc.filename, byteSize: doc.byteSize };
  }

  private async scanUpload(userId: string, bytes: Buffer) {
    const host = this.kernel.config.clamavHost;
    const required = this.kernel.config.clamavRequired;
    if (!host) {
      if (required) fail("SCANNER_UNAVAILABLE", 503, "The file scanner is unavailable");
      return;
    }
    try {
      await scanInstream(bytes, { host, port: this.kernel.config.clamavPort, timeoutMs: 20000 });
    } catch (error) {
      if (error instanceof InfectedUpload) {
        await this.kernel.prisma.auditLog.create({
          data: {
            actorType: "user",
            actorId: userId,
            action: "upload.rejected FILE_INFECTED",
            entityType: "document",
          },
        }).catch(() => undefined);
        fail("FILE_INFECTED", 422, "The file was rejected");
      }
      if (required) fail("SCANNER_UNAVAILABLE", 503, "The file scanner is unavailable");
    }
  }

  async download(userId: string, documentId: string) {
    const user = await this.fresh(userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const doc = await this.kernel.prisma.document.findFirst({ where: { id: documentId, userId } });
    if (!doc) fail("NOT_FOUND", 404, "Document was not found");
    const bytes = decryptBytes(await readFile(path.join(this.kernel.config.storageDir, doc.storageKey)), dek);
    return { filename: doc.filename, mime: doc.mime, bytes };
  }

  async addHearing(userId: string, caseId: string, input: { kind: "hearing" | "objection_deadline"; occursAt: string; title: string }) {
    const user = await this.fresh(userId);
    if (!(await this.kernel.plan(user.planCode, jurisdictionOf(user.jurisdiction).code)).caseManagement) fail("FEATURE_CASES", 402, "Case dates are not included in the current plan");
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    const caseFile = await this.kernel.prisma.caseFile.findFirst({ where: { id: caseId, userId } });
    if (!caseFile) fail("NOT_FOUND", 404, "Case was not found");
    const occursAt = new Date(input.occursAt);
    if (Number.isNaN(occursAt.getTime())) fail("VALIDATION", 400, "Date is invalid");
    const reminderAt = new Date(occursAt.getTime() - 24 * 3600 * 1000);
    const hearing = await this.kernel.prisma.hearing.create({
      data: {
        userId,
        caseId,
        kind: input.kind,
        occursAt,
        reminderAt,
        titleEnc: this.kernel.enc(dek, input.title.trim().slice(0, 160) || "موعد"),
      },
    });
    await this.reminders.schedule(hearing.id, reminderAt);
    return { id: hearing.id, occursAt: occursAt.toISOString() };
  }

  async ics(userId: string, caseId: string) {
    const detail = await this.getCase(userId, caseId);
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//elawyer//AR//"];
    for (const hearing of detail.hearings) {
      const stamp = hearing.occursAt.replace(/[-:]/g, "").replace(".000Z", "Z");
      lines.push("BEGIN:VEVENT", `UID:${hearing.id}@elawyer`, `DTSTAMP:${stamp}`, `DTSTART:${stamp}`, `SUMMARY:${hearing.title}`, "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  async integrations(userId: string) {
    const rows = await this.kernel.prisma.integrationAccount.findMany({ where: { userId } });
    return ["google_drive", "onedrive", "email", "calendar"].map((provider) => {
      const row = rows.find((item) => item.provider === provider);
      return {
        provider,
        configured: this.providerConfigured(provider),
        connected: row?.status === "connected",
        status: row?.status || "disconnected",
      };
    });
  }

  async startIntegration(userId: string, provider: string) {
    if (provider === "email") return { configured: this.providerConfigured("email"), url: null as string | null };
    if (!this.providerConfigured(provider)) return { configured: false, url: null as string | null };
    const payload = Buffer.from(JSON.stringify({ userId, provider, exp: Date.now() + 10 * 60 * 1000 })).toString("base64url");
    const state = `${payload}.${signSandbox(this.kernel.config.jwtSecret, payload)}`;
    const redirect = provider === "onedrive" ? this.kernel.config.msRedirectUrl : this.kernel.config.googleRedirectUrl;
    if (provider === "onedrive") {
      const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
      url.searchParams.set("client_id", this.kernel.config.msClientId);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("redirect_uri", redirect);
      url.searchParams.set("scope", "offline_access Files.ReadWrite");
      url.searchParams.set("state", state);
      return { configured: true, url: url.toString() };
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", this.kernel.config.googleClientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("scope", provider === "calendar" ? "https://www.googleapis.com/auth/calendar.events" : "https://www.googleapis.com/auth/drive.file");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    return { configured: true, url: url.toString() };
  }

  async integrationCallback(provider: string, code: string, state: string) {
    const [payload, sig] = state.split(".");
    if (!payload || !sig || !safeEqual(signSandbox(this.kernel.config.jwtSecret, payload), sig)) {
      fail("UNAUTHENTICATED", 401, "OAuth state was rejected");
    }
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId: string; provider: string; exp: number };
    if (parsed.exp < Date.now() || parsed.provider !== provider) fail("UNAUTHENTICATED", 401, "OAuth state expired");
    const tokenUrl = provider === "onedrive"
      ? "https://login.microsoftonline.com/common/oauth2/v2.0/token"
      : "https://oauth2.googleapis.com/token";
    const clientId = provider === "onedrive" ? this.kernel.config.msClientId : this.kernel.config.googleClientId;
    const clientSecret = provider === "onedrive" ? this.kernel.config.msClientSecret : this.kernel.config.googleClientSecret;
    const redirect = provider === "onedrive" ? this.kernel.config.msRedirectUrl : this.kernel.config.googleRedirectUrl;
    if (!clientSecret) fail("NOT_CONFIGURED", 409, "OAuth client secret is not set");
    const body = new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: "authorization_code" });
    const response = await fetch(tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (!response.ok) fail("OAUTH_FAILED", 502, "The token endpoint rejected the code");
    const tokens = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    const user = await this.fresh(parsed.userId);
    const dek = this.kernel.dekOf(user.wrappedDataKey);
    await this.kernel.prisma.integrationAccount.upsert({
      where: { userId_provider: { userId: user.id, provider: provider as IntegrationProvider } },
      create: {
        userId: user.id,
        provider: provider as IntegrationProvider,
        status: "connected",
        accessEnc: tokens.access_token ? this.kernel.enc(dek, tokens.access_token) : null,
        refreshEnc: tokens.refresh_token ? this.kernel.enc(dek, tokens.refresh_token) : null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      },
      update: {
        status: "connected",
        accessEnc: tokens.access_token ? this.kernel.enc(dek, tokens.access_token) : null,
        refreshEnc: tokens.refresh_token ? this.kernel.enc(dek, tokens.refresh_token) : null,
      },
    });
    return { connected: true };
  }

  async exportDrive(userId: string, memoId: string) {
    const memo = await this.kernel.prisma.memo.findFirst({ where: { id: memoId, userId } });
    if (!memo) fail("NOT_FOUND", 404, "Memo was not found");
    const account = await this.kernel.prisma.integrationAccount.findUnique({
      where: { userId_provider: { userId, provider: "google_drive" } },
    });
    const live = this.kernel.config.integrationsMode === "live" && account?.status === "connected" && account.accessEnc;
    if (!live) {
      const job = await this.kernel.prisma.exportJob.create({
        data: { userId, provider: "google_drive", memoId, status: "stubbed", externalId: `stub-${memoId.slice(0, 8)}` },
      });
      return { status: job.status, externalId: job.externalId || "" };
    }
    const user = await this.fresh(userId);
    const token = this.kernel.dec(this.kernel.dekOf(user.wrappedDataKey), account.accessEnc || "");
    const file = await this.exportMemo(userId, memoId, "docx");
    const metadata = JSON.stringify({ name: file.filename, mimeType: file.mime });
    const boundary = `elw${randomUUID().replace(/-/g, "")}`;
    const preamble = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${file.mime}\r\n\r\n`);
    const ending = Buffer.from(`\r\n--${boundary}--`);
    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body: Buffer.concat([preamble, file.bytes, ending]),
    });
    if (!response.ok) fail("DRIVE_FAILED", 502, "Drive did not accept the file");
    const payload = (await response.json()) as { id?: string };
    const job = await this.kernel.prisma.exportJob.create({
      data: { userId, provider: "google_drive", memoId, status: "uploaded", externalId: payload.id || "" },
    });
    return { status: job.status, externalId: job.externalId || "" };
  }

  async org(userId: string) {
    const user = await this.fresh(userId);
    if (!user.orgId) return null;
    const org = await this.kernel.prisma.organization.findUnique({ where: { id: user.orgId } });
    if (!org) return null;
    const seatsUsed = await this.kernel.prisma.user.count({ where: { orgId: org.id } });
    return { id: org.id, name: org.name, seatLimit: org.seatLimit, seatsUsed, letterheadName: org.letterheadName };
  }

  async updateOrg(userId: string, input: { name?: string; letterheadName?: string }) {
    const user = await this.fresh(userId);
    if (user.orgRole !== "owner" || !user.orgId) fail("FORBIDDEN", 403, "Only the owner can edit this");
    if (!(await this.kernel.plan(user.planCode, jurisdictionOf(user.jurisdiction).code)).letterhead && input.letterheadName) fail("FEATURE_CASES", 402, "Letterhead is not included in this plan");
    const org = await this.kernel.prisma.organization.update({
      where: { id: user.orgId },
      data: {
        name: input.name?.trim().slice(0, 120) || undefined,
        letterheadName: input.letterheadName !== undefined ? input.letterheadName.trim().slice(0, 160) : undefined,
      },
    });
    return { id: org.id, letterheadName: org.letterheadName, name: org.name };
  }

  async addMember(_userId: string, input: { name: string; phone: string; email: string; consent: boolean }) {
    if (input.consent !== true) fail("CONSENT_REQUIRED", 400, "The member's consent is required");
    fail("FEATURE_CASES", 402, "Extra seats are not offered");
  }

  private async fresh(userId: string) {
    const user = await this.kernel.prisma.user.findUnique({ where: { id: userId } });
    if (!user) fail("NOT_FOUND", 404, "Account was not found");
    if (user.planCode !== "free" && user.planRenewsAt && user.planRenewsAt.getTime() < Date.now()) {
      return this.kernel.prisma.user.update({
        where: { id: userId },
        data: { planCode: "free", memoCountPeriod: 0, chatCountPeriod: 0, planRenewsAt: null },
      });
    }
    return user;
  }

  private async ownedChat(userId: string, chatId: string) {
    const chat = await this.kernel.prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) fail("NOT_FOUND", 404, "Chat was not found");
    return chat;
  }

  private presentChat(chat: { id: string; titleEnc: string; court: string; memoType: MemoType; caseId: string | null; updatedAt: Date }, dek: Buffer) {
    return {
      id: chat.id,
      title: this.kernel.dec(dek, chat.titleEnc),
      court: chat.court,
      memoType: chat.memoType,
      caseId: chat.caseId,
      updatedAt: chat.updatedAt.toISOString(),
    };
  }

  private async knownSet(citations: CitationRef[]) {
    const articleIds = citations.filter((item) => item.kind === "article").map((item) => item.id);
    const shariaIds = citations.filter((item) => item.kind === "sharia").map((item) => item.id);
    const articles = await this.kernel.prisma.article.findMany({
      where: { id: { in: articleIds } },
      include: { law: { select: { nameAr: true } } },
    });
    const judgmentIds = citations.filter((item) => item.kind === "judgment").map((item) => item.id);
    const sharia = await this.kernel.prisma.shariaSource.findMany({ where: { id: { in: shariaIds } } });
    const judgments = await this.kernel.prisma.judgment.findMany({ where: { id: { in: judgmentIds } } });
    return {
      articles: new Map(articles.map((row) => [row.id, knownArticle(row.number, row.law.nameAr, row.textAr)])),
      sharia: new Map(sharia.map((row) => [row.id, { textHash: textHash(row.textAr), reference: row.reference }])),
      judgments: new Map(judgments.map((row) => [row.id, { textHash: textHash(row.fullText), number: row.judgmentNo }])),
    };
  }

  private modelPressure(userId: string) {
    const now = Date.now();
    const hits = (this.modelHits.get(userId) || []).filter((stamp) => now - stamp < 60000);
    hits.push(now);
    this.modelHits.set(userId, hits);
    return hits.length > 12;
  }

  private readonly modelHits = new Map<string, number[]>();

  private async routeFor(userId: string, planCode: string, purpose: "chat" | "draft", turns: { role: "user" | "assistant"; text: string }[], articleCount: number) {
    const used = (await this.monthTokens(userId)) + (this.modelPressure(userId) ? 1_000_000 : 0);
    return routeModel({
      purpose,
      plan: (planCode === "basic" || planCode === "pro" ? planCode : "free") as PlanCode,
      usedTokens: used,
      turns,
      articleCount,
      chatModel: this.kernel.config.chatModel,
      draftModel: this.kernel.config.draftModel,
    });
  }

  private period() {
    return new Date().toISOString().slice(0, 7);
  }

  private async monthTokens(userId: string) {
    try {
      const sum = await this.kernel.prisma.tokenLedger.aggregate({
        where: { userId, period: this.period() },
        _sum: { tokens: true },
      });
      return sum._sum.tokens || 0;
    } catch {
      return 0;
    }
  }

  private async noteUsage(userId: string, planCode: string, purpose: string, tokens: number, degraded: boolean, cached: boolean) {
    if (tokens < 1) return;
    try {
      await this.kernel.prisma.tokenLedger.create({
        data: { userId, planCode, purpose, tokens, degraded, cached, period: this.period() },
      });
    } catch {
      return;
    }
  }

  private async recordDraftCheck(failure: DraftCheckRecord, modelId: string, attempt: number) {
    const row = {
      recordId: failure.recordId,
      articleNumber: failure.articleNumber,
      statute: failure.statute,
      modelId: modelId.slice(0, 80),
      attempt,
      failureType: failure.failureType,
      quoteSpan: failure.quoteSpan,
    };
    try {
      await this.kernel.prisma.draftCheckFailure.create({ data: row });
    } catch {
      this.logger.warn("Draft check was not stored");
    }
    Sentry.captureMessage("draft check", { level: "warning", extra: { draftCheck: row } });
  }

  private async completeDraft(decision: RouteDecision): Promise<{ text: string | null; called: boolean }> {
    if (this.kernel.config.llmProvider !== "remote" || !this.kernel.config.modelBaseUrl || !this.kernel.config.modelApiKey || decision.turns.length === 0) {
      return { text: null, called: false };
    }
    try {
      const response = await fetch(`${this.kernel.config.modelBaseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${this.kernel.config.modelApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: decision.model,
          temperature: 0,
          messages: [
            { role: "system", content: decision.prefix },
            ...decision.turns.map((turn) => ({ role: turn.role, content: turn.text })),
          ],
        }),
      });
      if (!response.ok) return { text: null, called: true };
      const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      return { text: payload.choices?.[0]?.message?.content?.trim() || null, called: true };
    } catch {
      return { text: null, called: true };
    }
  }

  private async complete(decision: RouteDecision): Promise<string | null> {
    if (this.kernel.config.llmProvider !== "remote") return null;
    if (!this.kernel.config.modelBaseUrl || !this.kernel.config.modelApiKey) return null;
    if (decision.turns.length === 0) return null;
    try {
      const response = await fetch(`${this.kernel.config.modelBaseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.kernel.config.modelApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: decision.model,
          temperature: 0,
          messages: [
            { role: "system", content: decision.prefix },
            ...decision.turns.map((turn) => ({ role: turn.role, content: turn.text })),
          ],
        }),
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      return payload.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }

  private async verifyDraft(body: string): Promise<boolean> {
    const model = verifierModel(this.kernel.config.draftModel, this.kernel.config.verifierModel);
    if (!model || this.kernel.config.llmProvider !== "remote" || !this.kernel.config.modelBaseUrl || !this.kernel.config.modelApiKey) return true;
    try {
      const response = await fetch(`${this.kernel.config.modelBaseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.kernel.config.modelApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: "system", content: "Check that every article number in the memo was supplied. Reply ok or reject." },
            { role: "user", content: body.slice(0, 4000) },
          ],
        }),
      });
      if (!response.ok) return true;
      const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const text = payload.choices?.[0]?.message?.content || "";
      return !/reject|مرفوض/i.test(text);
    } catch {
      return true;
    }
  }

  private async maybeRewriteFacts(facts: string, allowedNumbers: string[], decision: RouteDecision) {
    if (this.kernel.config.llmProvider !== "remote") return facts;
    if (!this.kernel.config.modelBaseUrl || !this.kernel.config.modelApiKey) {
      fail("MODEL_NOT_CONFIGURED", 503, "Model endpoint is not configured");
    }
    const numbers = allowedNumbers.slice(0, decision.articleLimit);
    const shown = decision.degraded ? facts.slice(0, 400) : facts;
    const response = await fetch(`${this.kernel.config.modelBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.kernel.config.modelApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: decision.model,
        temperature: 0,
        messages: [
          { role: "system", content: decision.prefix },
          {
            role: "user",
            content: `Rewrite the facts in formal Arabic. Do not introduce article numbers. Numbers already present may stay only if they are in this list: ${numbers.join(",") || "none"}. Return JSON {"facts":"..."}.\n${shown}`,
          },
        ],
      }),
    });
    if (!response.ok) return facts;
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = payload.choices?.[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return facts;
    try {
      const parsed = JSON.parse(match[0]) as { facts?: string };
      return parsed.facts?.trim() ? parsed.facts.trim() : facts;
    } catch {
      return facts;
    }
  }

  private providerConfigured(provider: string) {
    if (provider === "google_drive" || provider === "calendar") return Boolean(this.kernel.config.googleClientId);
    if (provider === "onedrive") return Boolean(this.kernel.config.msClientId);
    if (provider === "email") return Boolean(this.kernel.config.smtpHost);
    return false;
  }

  private async writeInvoice(tx: Prisma.TransactionClient, user: User, total: number, description: string) {
    const place = jurisdictionOf(user.jurisdiction);
    const split = splitVatInclusive(total, place.vatRateBps);
    const seq = await tx.invoiceSequence.upsert({
      where: { id: 1 },
      create: { id: 1, value: 1 },
      update: { value: { increment: 1 } },
    });
    const issued = new Date();
    await tx.invoice.create({
      data: {
        userId: user.id,
        number: nextInvoiceNumber(issued.getUTCFullYear(), seq.value),
        uuid: randomUUID(),
        subtotalHalalas: split.subtotalHalalas,
        vatHalalas: split.vatHalalas,
        totalHalalas: split.totalHalalas,
        sellerName: this.kernel.config.sellerName,
        sellerVat: this.kernel.config.sellerVat,
        sellerAddress: this.kernel.config.sellerAddress,
        buyerName: user.name,
        jurisdiction: place.code,
        currency: place.currency,
        vatRateBps: place.vatRateBps,
        lineDescription: description,
        qrTlvBase64: zatcaQrBase64({
          sellerName: this.kernel.config.sellerName,
          vatNumber: this.kernel.config.sellerVat,
          timestamp: issued.toISOString(),
          totalSar: halalasToSar(split.totalHalalas),
          vatSar: halalasToSar(split.vatHalalas),
        }),
      },
    });
  }
}

async function readUploaded(mime: string, buffer: Buffer): Promise<string> {
  const dir = path.join(tmpdir(), `elw-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    if (mime === "application/pdf") {
      const file = path.join(dir, "in.pdf");
      await writeFile(file, buffer);
      try {
        const { stdout } = await exec("pdftotext", ["-layout", file, "-"], { timeout: 20000 });
        if (stdout.trim().length > 12) return stdout.trim().slice(0, 20000);
      } catch {
        /* scanned */
      }
      try {
        await exec("pdftoppm", ["-png", "-f", "1", "-l", "2", file, path.join(dir, "page")], { timeout: 20000 });
      } catch {
        return "";
      }
    } else {
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      await writeFile(path.join(dir, `in.${ext}`), buffer);
    }
    const { readdir } = await import("fs/promises");
    const files = (await readdir(dir)).filter((name) => name.endsWith(".png") || name.endsWith(".jpg"));
    const parts: string[] = [];
    for (const name of files) {
      try {
        const { stdout } = await exec("tesseract", [path.join(dir, name), "stdout", "-l", "ara+eng"], { timeout: 30000, maxBuffer: 2_000_000 });
        parts.push(stdout);
      } catch {
        /* keep going */
      }
    }
    return parts.join("\n").trim().slice(0, 20000);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
