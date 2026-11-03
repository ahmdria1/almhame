ALTER TABLE "Law" ADD COLUMN "citeable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Law" ALTER COLUMN "effectiveDate" DROP NOT NULL;

CREATE TABLE "Judgment" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "court" TEXT NOT NULL DEFAULT '',
    "courtType" TEXT NOT NULL DEFAULT '',
    "circuit" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "caseNo" TEXT NOT NULL DEFAULT '',
    "judgmentNo" TEXT NOT NULL,
    "appealNo" TEXT NOT NULL DEFAULT '',
    "judgmentDateHijri" TEXT NOT NULL DEFAULT '',
    "judgmentDateGregorian" TEXT NOT NULL DEFAULT '',
    "appealDateHijri" TEXT NOT NULL DEFAULT '',
    "isAppeal" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL DEFAULT '',
    "facts" TEXT NOT NULL DEFAULT '',
    "reasons" TEXT NOT NULL DEFAULT '',
    "ruling" TEXT NOT NULL DEFAULT '',
    "fullText" TEXT NOT NULL,
    "rawHtml" TEXT NOT NULL DEFAULT '',
    "principleNo" TEXT NOT NULL DEFAULT '',
    "principleText" TEXT NOT NULL DEFAULT '',
    "statutesCited" JSONB,
    "sourceUrl" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "sha256" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "verbatimStatus" TEXT NOT NULL,
    "blockedReason" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Judgment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Judgment_sourceRecordId_key" ON "Judgment"("sourceRecordId");
CREATE INDEX "Judgment_judgmentNo_idx" ON "Judgment"("judgmentNo");
CREATE INDEX "Judgment_court_idx" ON "Judgment"("court");

ALTER TABLE "MemoCitation" ADD COLUMN "judgmentId" TEXT;
ALTER TABLE "MemoCitation" ADD CONSTRAINT "MemoCitation_judgmentId_fkey" FOREIGN KEY ("judgmentId") REFERENCES "Judgment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
