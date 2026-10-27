import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { DEFAULT_JURISDICTION, type JurisdictionCode } from "@elawyer/types";
import { parse } from "csv-parse/sync";
import { EMBED_DIM, mockEmbed, vectorLiteral } from "./domain/embeddings";
import { Kernel } from "./kernel";
import { fail } from "./http-error";

const exec = promisify(execFile);

interface LawInput {
  jurisdiction?: string;
  key: string;
  nameAr: string;
  nameEn: string;
  sourceUrl: string;
  version: string;
  effectiveDate: string;
  isSample: boolean;
  courts: string[];
  articles: { number: string; textAr: string; textEn: string; sourceUrl: string; isSample?: boolean }[];
}

interface ShariaInput {
  jurisdiction?: string;
  key: string;
  kind: "quran" | "hadith" | "fiqh";
  reference: string;
  textAr: string;
  textEn: string;
  sourceUrl: string;
  isSample: boolean;
  courts: string[];
}

@Injectable()
export class CorpusService {
  constructor(private readonly kernel: Kernel) {}

  async embed(text: string): Promise<number[]> {
    if (this.kernel.config.embeddingProvider === "remote") {
      if (!this.kernel.config.embeddingBaseUrl || !this.kernel.config.embeddingApiKey) {
        fail("EMBEDDINGS_NOT_CONFIGURED", 503, "Embedding endpoint is not configured");
      }
      const response = await fetch(`${this.kernel.config.embeddingBaseUrl.replace(/\/$/, "")}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.kernel.config.embeddingApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: this.kernel.config.embeddingModel, input: text, dimensions: EMBED_DIM }),
      });
      if (!response.ok) fail("EMBEDDINGS_FAILED", 502, "Embedding request failed");
      const payload = (await response.json()) as { data?: { embedding?: number[] }[] };
      const vector = payload.data?.[0]?.embedding;
      if (!vector || vector.length !== EMBED_DIM) fail("EMBEDDINGS_FAILED", 502, "Unexpected embedding shape");
      return vector;
    }
    return mockEmbed(text);
  }

  async importRecords(input: { laws: LawInput[]; sharia: ShariaInput[]; confirmOfficial: boolean }) {
    for (const law of input.laws) this.assertRecord(law.isSample, law.sourceUrl, input.confirmOfficial);
    for (const row of input.sharia) this.assertRecord(row.isSample, row.sourceUrl, input.confirmOfficial);
    for (const law of input.laws) {
      for (const article of law.articles) {
        this.assertRecord(article.isSample !== false && law.isSample, article.sourceUrl, input.confirmOfficial);
        if (!article.number || !article.textAr) fail("VALIDATION", 400, "Article number and text are required");
      }
      const jurisdiction = law.jurisdiction || DEFAULT_JURISDICTION;
      const saved = await this.kernel.prisma.law.upsert({
        where: { jurisdiction_key: { jurisdiction, key: law.key } },
        create: {
          jurisdiction,
          key: law.key,
          nameAr: law.nameAr,
          nameEn: law.nameEn,
          sourceUrl: law.sourceUrl,
          version: law.version,
          effectiveDate: new Date(law.effectiveDate),
          isSample: law.isSample,
          courts: law.courts,
        },
        update: {
          nameAr: law.nameAr,
          nameEn: law.nameEn,
          sourceUrl: law.sourceUrl,
          version: law.version,
          effectiveDate: new Date(law.effectiveDate),
          isSample: law.isSample,
          courts: law.courts,
        },
      });
      for (const article of law.articles) {
        const row = await this.kernel.prisma.article.upsert({
          where: { lawId_number: { lawId: saved.id, number: article.number } },
          create: {
            lawId: saved.id,
            number: article.number,
            textAr: article.textAr,
            textEn: article.textEn || article.textAr,
            sourceUrl: article.sourceUrl,
            isSample: article.isSample !== false,
          },
          update: {
            textAr: article.textAr,
            textEn: article.textEn || article.textAr,
            sourceUrl: article.sourceUrl,
            isSample: article.isSample !== false,
          },
        });
        await this.storeVector("article", row.id, `${law.nameAr} ${article.number} ${article.textAr}`);
      }
    }
    for (const row of input.sharia) {
      const jurisdiction = row.jurisdiction || DEFAULT_JURISDICTION;
      const saved = await this.kernel.prisma.shariaSource.upsert({
        where: { jurisdiction_key: { jurisdiction, key: row.key } },
        create: {
          jurisdiction,
          key: row.key,
          kind: row.kind,
          reference: row.reference,
          textAr: row.textAr,
          textEn: row.textEn,
          sourceUrl: row.sourceUrl,
          isSample: row.isSample,
          courts: row.courts,
        },
        update: {
          kind: row.kind,
          reference: row.reference,
          textAr: row.textAr,
          textEn: row.textEn,
          sourceUrl: row.sourceUrl,
          isSample: row.isSample,
          courts: row.courts,
        },
      });
      await this.storeVector("sharia", saved.id, `${row.reference} ${row.textAr}`);
    }
    return { laws: input.laws.length, sharia: input.sharia.length };
  }

  parseImport(body: string, contentType: string, confirmOfficial: boolean) {
    if (contentType.includes("csv") || body.trim().startsWith("recordType")) {
      const rows = parse(body, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
      const laws = new Map<string, LawInput>();
      const sharia: ShariaInput[] = [];
      for (const row of rows) {
        const sample = String(row.isSample || "true") !== "false";
        const courts = (row.courts || "").split("|").map((item) => item.trim()).filter(Boolean);
        if (row.recordType === "sharia") {
          sharia.push({
            jurisdiction: row.jurisdiction || DEFAULT_JURISDICTION,
            key: row.key,
            kind: (row.kind || "fiqh") as ShariaInput["kind"],
            reference: row.reference || row.nameAr,
            textAr: row.textAr,
            textEn: row.textEn || row.textAr,
            sourceUrl: row.sourceUrl,
            isSample: sample,
            courts,
          });
          continue;
        }
        const key = row.parentKey || row.key;
        const jurisdiction = row.jurisdiction || DEFAULT_JURISDICTION;
        const law = laws.get(`${jurisdiction}:${key}`) || {
          jurisdiction,
          key,
          nameAr: row.nameAr,
          nameEn: row.nameEn || row.nameAr,
          sourceUrl: row.sourceUrl,
          version: row.version || "1",
          effectiveDate: row.effectiveDate || "2026-01-01",
          isSample: sample,
          courts,
          articles: [],
        };
        laws.set(`${jurisdiction}:${key}`, law);
        if (row.number) {
          law.articles.push({
            number: row.number,
            textAr: row.textAr,
            textEn: row.textEn || row.textAr,
            sourceUrl: row.articleUrl || row.sourceUrl,
            isSample: sample,
          });
        }
      }
      return { laws: [...laws.values()], sharia, confirmOfficial };
    }
    const json = JSON.parse(body) as { laws?: LawInput[]; sharia?: ShariaInput[]; confirmOfficial?: boolean };
    return {
      laws: json.laws || [],
      sharia: json.sharia || [],
      confirmOfficial: confirmOfficial || json.confirmOfficial === true,
    };
  }

  async retrieve(court: string, query: string, jurisdiction: JurisdictionCode = DEFAULT_JURISDICTION) {
    const like = `%${query.slice(0, 80).replace(/[%_]/g, "")}%`;
    const vector = vectorLiteral(await this.embed(query));
    const articles = await this.rankArticles(jurisdiction, court, like, vector);
    const sharia = await this.rankSharia(jurisdiction, court, like, vector);
    return { articles: articles.slice(0, 2), sharia: sharia.slice(0, 1) };
  }

  async counts() {
    const [laws, articles, sharia, sampleArticles, rows, runs, shariaByKind] = await Promise.all([
      this.kernel.prisma.law.count(),
      this.kernel.prisma.article.count(),
      this.kernel.prisma.shariaSource.count(),
      this.kernel.prisma.article.count({ where: { isSample: true } }),
      this.kernel.prisma.law.findMany({
        orderBy: { nameAr: "asc" },
        include: { _count: { select: { articles: true } } },
      }),
      this.kernel.prisma.ingestionRun.findMany({ orderBy: { startedAt: "desc" }, take: 8 }),
      this.kernel.prisma.shariaSource.groupBy({ by: ["kind"], _count: { _all: true } }),
    ]);
    return {
      laws,
      articles,
      sharia,
      sampleArticles,
      byLaw: rows.map((row) => ({
        key: row.key,
        nameAr: row.nameAr,
        articles: row._count.articles,
        sourceUrl: row.sourceUrl,
        issuedHijri: row.issuedHijri,
        effectiveDate: row.effectiveDate.toISOString().slice(0, 10),
        statusLabel: row.statusLabel,
        isSample: row.isSample,
      })),
      shariaByKind: Object.fromEntries(shariaByKind.map((row) => [row.kind, row._count._all])),
      runs,
    };
  }

  async startRefresh() {
    const active = await this.kernel.prisma.ingestionRun.findFirst({ where: { status: "running" } });
    if (active) return active;
    const run = await this.kernel.prisma.ingestionRun.create({ data: { source: "official", status: "running" } });
    void this.finishRefresh(run.id);
    return run;
  }

  async importOfficial() {
    const root = path.resolve(__dirname, "../../../corpus/official");
    const boeDir = path.join(root, "boe");
    const names = (await readdir(boeDir).catch(() => [] as string[])).filter((name) => name.endsWith(".json") && name !== "manifest-report.json" && name !== "blocked.json");
    const laws: LawInput[] = [];
    for (const name of names) {
      const parsed = JSON.parse(await readFile(path.join(boeDir, name), "utf8")) as LawInput & {
        issuedHijri?: string;
        publishedHijri?: string;
        statusLabel?: string;
      };
      parsed.isSample = false;
      parsed.articles = parsed.articles.map((article) => ({ ...article, isSample: false, textEn: article.textEn || "" }));
      laws.push(parsed);
      await this.importRecords({ laws: [parsed], sharia: [], confirmOfficial: true });
      const saved = await this.kernel.prisma.law.findUnique({
        where: { jurisdiction_key: { jurisdiction: parsed.jurisdiction || DEFAULT_JURISDICTION, key: parsed.key } },
      });
      if (saved) {
        await this.kernel.prisma.law.update({
          where: { id: saved.id },
          data: {
            issuedHijri: parsed.issuedHijri || "",
            publishedHijri: parsed.publishedHijri || "",
            statusLabel: parsed.statusLabel || "",
          },
        });
      }
    }
    const sharia = await this.readSharia(root);
    let shariaCount = 0;
    for (let offset = 0; offset < sharia.length; offset += 200) {
      const batch = sharia.slice(offset, offset + 200);
      await this.kernel.prisma.$transaction(
        batch.map((row) =>
          this.kernel.prisma.shariaSource.upsert({
            where: { jurisdiction_key: { jurisdiction: DEFAULT_JURISDICTION, key: row.key } },
            create: { ...row, jurisdiction: DEFAULT_JURISDICTION, courts: row.courts },
            update: {
              reference: row.reference,
              textAr: row.textAr,
              sourceUrl: row.sourceUrl,
              isSample: false,
            },
          }),
        ),
      );
      shariaCount += batch.length;
    }
    const articles = laws.reduce((sum, law) => sum + law.articles.length, 0);
    return { laws: laws.length, articles, sharia: shariaCount };
  }

  private async finishRefresh(id: string) {
    try {
      const script = path.resolve(__dirname, "../../../corpus/fetch-official.mjs");
      await exec(process.execPath, [script], { cwd: path.resolve(__dirname, "../../.."), timeout: 30 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 });
      const result = await this.importOfficial();
      await this.kernel.prisma.ingestionRun.update({
        where: { id },
        data: { status: "ok", finishedAt: new Date(), ...result },
      });
    } catch (error) {
      await this.kernel.prisma.ingestionRun.update({
        where: { id },
        data: { status: "error", finishedAt: new Date(), note: error instanceof Error ? error.message.slice(0, 500) : "refresh failed" },
      });
    }
  }

  private async readSharia(root: string): Promise<ShariaInput[]> {
    const rows: ShariaInput[] = [];
    const quranPath = path.join(root, "tanzil", "quran-uthmani.txt");
    const quran = await readFile(quranPath, "utf8").catch(() => "");
    for (const line of quran.split("\n")) {
      const match = line.match(/^(\d+)\|(\d+)\|(.*)$/);
      if (!match || !match[3].trim()) continue;
      const reference = `${match[1]}:${match[2]}`;
      rows.push({
        key: `quran:${reference}`,
        kind: "quran",
        reference,
        textAr: match[3].trim(),
        textEn: "",
        sourceUrl: "https://tanzil.net/download/",
        isSample: false,
        courts: ["general", "personal_status", "criminal", "labor", "commercial", "appeal", "supreme"],
      });
    }
    const hadithDir = path.join(root, "hadith");
    const files = (await readdir(hadithDir).catch(() => [] as string[])).filter((name) => name.endsWith(".min.json"));
    for (const file of files) {
      const parsed = JSON.parse(await readFile(path.join(hadithDir, file), "utf8")) as {
        metadata?: { name?: string; sections?: Record<string, string> };
        hadiths?: { hadithnumber?: number; text?: string; grades?: { grade?: string }[]; reference?: { book?: number; hadith?: number } }[];
      };
      const edition = file.replace(".min.json", "");
      const sections = parsed.metadata?.sections || {};
      for (const hadith of parsed.hadiths || []) {
        if (!hadith.text || hadith.hadithnumber == null) continue;
        const book = hadith.reference?.book ?? 0;
        const number = hadith.reference?.hadith ?? hadith.hadithnumber;
        const grade = (hadith.grades || []).map((item) => item.grade).filter(Boolean).join("؛ ");
        const bookName = sections[String(book)] || "";
        rows.push({
          key: `hadith:${edition}:${hadith.hadithnumber}`,
          kind: "hadith",
          reference: [parsed.metadata?.name || edition, bookName, `${book}/${number}`, `رقم ${hadith.hadithnumber}`, grade].filter(Boolean).join(" — "),
          textAr: hadith.text,
          textEn: "",
          sourceUrl: `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${file}`,
          isSample: false,
          courts: ["general", "personal_status", "criminal", "labor", "commercial"],
        });
      }
    }
    return rows;
  }

  private assertRecord(isSample: boolean, sourceUrl: string, confirmOfficial: boolean) {
    if (!sourceUrl || !/^https?:\/\//.test(sourceUrl)) fail("VALIDATION", 400, "A source URL is required");
    if (!isSample && !confirmOfficial) {
      fail("SAMPLE_REQUIRED", 400, "Official rows require confirmOfficial");
    }
  }

  private async storeVector(targetType: string, targetId: string, text: string) {
    const literal = vectorLiteral(await this.embed(text));
    await this.kernel.prisma.$executeRaw`
      INSERT INTO "CorpusEmbedding" ("id", "targetType", "targetId", "embedding")
      VALUES (${randomUUID()}, ${targetType}, ${targetId}, CAST(${literal} AS vector))
      ON CONFLICT ("targetId") DO UPDATE
      SET "targetType" = EXCLUDED."targetType", "embedding" = EXCLUDED."embedding"
    `;
  }

  private async rankArticles(jurisdiction: string, court: string, like: string, vector: string) {
    const keyword = await this.kernel.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT a.id FROM "Article" a
      JOIN "Law" l ON l.id = a."lawId"
      WHERE l.jurisdiction = ${jurisdiction}
        AND ${court} = ANY(l.courts)
        AND (a."textAr" ILIKE ${like} OR a."textEn" ILIKE ${like} OR l."nameAr" ILIKE ${like})
      LIMIT 8
    `);
    const vectorIds = await this.kernel.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT a.id
      FROM "Article" a
      JOIN "Law" l ON l.id = a."lawId"
      JOIN "CorpusEmbedding" e ON e."targetId" = a.id AND e."targetType" = 'article'
      WHERE l.jurisdiction = ${jurisdiction}
        AND ${court} = ANY(l.courts)
      ORDER BY e.embedding <=> CAST(${vector} AS vector)
      LIMIT 8
    `);
    const ids = [...new Set([...keyword.map((row) => row.id), ...vectorIds.map((row) => row.id)])];
    if (ids.length === 0) {
      const fallback = await this.kernel.prisma.article.findMany({
        where: { law: { jurisdiction, courts: { has: court } } },
        include: { law: true },
        take: 2,
      });
      return fallback.map((row) => this.presentArticle(row));
    }
    const rows = await this.kernel.prisma.article.findMany({ where: { id: { in: ids } }, include: { law: true } });
    const order = new Map(ids.map((id, index) => [id, index]));
    return rows
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map((row) => this.presentArticle(row));
  }

  private async rankSharia(jurisdiction: string, court: string, like: string, vector: string) {
    const keyword = await this.kernel.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM "ShariaSource"
      WHERE jurisdiction = ${jurisdiction}
        AND ${court} = ANY(courts)
        AND ("textAr" ILIKE ${like} OR reference ILIKE ${like})
      LIMIT 4
    `);
    const vectorIds = await this.kernel.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT s.id
      FROM "ShariaSource" s
      JOIN "CorpusEmbedding" e ON e."targetId" = s.id AND e."targetType" = 'sharia'
      WHERE s.jurisdiction = ${jurisdiction}
        AND ${court} = ANY(s.courts)
      ORDER BY e.embedding <=> CAST(${vector} AS vector)
      LIMIT 4
    `);
    const ids = [...new Set([...keyword.map((row) => row.id), ...vectorIds.map((row) => row.id)])];
    const rows = ids.length
      ? await this.kernel.prisma.shariaSource.findMany({ where: { id: { in: ids } } })
      : await this.kernel.prisma.shariaSource.findMany({ where: { jurisdiction, courts: { has: court } }, take: 1 });
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      reference: row.reference,
      textAr: row.textAr,
      textEn: row.textEn,
      sourceUrl: row.sourceUrl,
      isSample: row.isSample,
    }));
  }

  private presentArticle(row: {
    id: string;
    number: string;
    textAr: string;
    textEn: string;
    sourceUrl: string;
    isSample: boolean;
    law: { nameAr: string; nameEn: string; version: string; effectiveDate: Date };
  }) {
    return {
      id: row.id,
      number: row.number,
      textAr: row.textAr,
      textEn: row.textEn,
      lawNameAr: row.law.nameAr,
      lawNameEn: row.law.nameEn,
      sourceUrl: row.sourceUrl,
      isSample: row.isSample,
      version: row.law.version,
      effectiveDate: row.law.effectiveDate.toISOString().slice(0, 10),
    };
  }
}

export type { LawInput, ShariaInput };
