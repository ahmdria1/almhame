CREATE TABLE "Jurisdiction" (
    "code" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "minorPerUnit" INTEGER NOT NULL,
    "vatRateBps" INTEGER NOT NULL,
    CONSTRAINT "Jurisdiction_pkey" PRIMARY KEY ("code")
);

INSERT INTO "Jurisdiction" ("code", "currency", "minorPerUnit", "vatRateBps")
VALUES ('SA', 'SAR', 100, 1500);

CREATE TABLE "Court" (
    "jurisdiction" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    CONSTRAINT "Court_pkey" PRIMARY KEY ("jurisdiction", "code")
);

CREATE TABLE "DocumentTemplate" (
    "jurisdiction" TEXT NOT NULL,
    "memoType" "MemoType" NOT NULL,
    "titleAr" TEXT NOT NULL,
    "courtHeadings" JSONB NOT NULL,
    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("jurisdiction", "memoType")
);

ALTER TABLE "User" ADD COLUMN "jurisdiction" TEXT NOT NULL DEFAULT 'SA';
ALTER TABLE "CaseFile" ADD COLUMN "jurisdiction" TEXT NOT NULL DEFAULT 'SA';
ALTER TABLE "Chat" ADD COLUMN "jurisdiction" TEXT NOT NULL DEFAULT 'SA';
ALTER TABLE "Memo" ADD COLUMN "jurisdiction" TEXT NOT NULL DEFAULT 'SA';
ALTER TABLE "Law" ADD COLUMN "jurisdiction" TEXT NOT NULL DEFAULT 'SA';
ALTER TABLE "ShariaSource" ADD COLUMN "jurisdiction" TEXT NOT NULL DEFAULT 'SA';
ALTER TABLE "Invoice" ADD COLUMN "jurisdiction" TEXT NOT NULL DEFAULT 'SA';
ALTER TABLE "PaymentIntent" ADD COLUMN "jurisdiction" TEXT NOT NULL DEFAULT 'SA';
ALTER TABLE "PaymentIntent" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'SAR';
ALTER TABLE "Wallet" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'SAR';

ALTER TABLE "CaseFile" ALTER COLUMN "court" TYPE TEXT USING "court"::text;
ALTER TABLE "Chat" ALTER COLUMN "court" TYPE TEXT USING "court"::text;
ALTER TABLE "Memo" ALTER COLUMN "court" TYPE TEXT USING "court"::text;
ALTER TABLE "Law" ALTER COLUMN "courts" TYPE TEXT[] USING COALESCE("courts"::text[], ARRAY[]::text[]);
ALTER TABLE "Law" ALTER COLUMN "courts" SET NOT NULL;
ALTER TABLE "ShariaSource" ALTER COLUMN "courts" TYPE TEXT[] USING COALESCE("courts"::text[], ARRAY[]::text[]);
ALTER TABLE "ShariaSource" ALTER COLUMN "courts" SET NOT NULL;

DROP TYPE "CourtType";

DROP INDEX "Law_key_key";
CREATE UNIQUE INDEX "Law_jurisdiction_key_key" ON "Law"("jurisdiction", "key");
DROP INDEX "ShariaSource_key_key";
CREATE UNIQUE INDEX "ShariaSource_jurisdiction_key_key" ON "ShariaSource"("jurisdiction", "key");

ALTER TABLE "PlanSetting" ADD COLUMN "jurisdiction" TEXT NOT NULL DEFAULT 'SA';
ALTER TABLE "PlanSetting" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'SAR';
ALTER TABLE "PlanSetting" ADD COLUMN "courts" TEXT[] NOT NULL DEFAULT ARRAY[]::text[];
UPDATE "PlanSetting" SET "courts" = CASE "code"
    WHEN 'free' THEN ARRAY['general', 'labor']::text[]
    WHEN 'basic' THEN ARRAY['general', 'labor', 'personal_status', 'criminal']::text[]
    ELSE ARRAY['general', 'criminal', 'personal_status', 'labor', 'commercial', 'enforcement', 'administrative', 'appeal', 'supreme']::text[]
END;
ALTER TABLE "PlanSetting" DROP CONSTRAINT "PlanSetting_pkey";
ALTER TABLE "PlanSetting" ADD CONSTRAINT "PlanSetting_pkey" PRIMARY KEY ("jurisdiction", "code");

ALTER TABLE "User" ADD CONSTRAINT "User_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseFile" ADD CONSTRAINT "CaseFile_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Law" ADD CONSTRAINT "Law_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShariaSource" ADD CONSTRAINT "ShariaSource_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Court" ADD CONSTRAINT "Court_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanSetting" ADD CONSTRAINT "PlanSetting_jurisdiction_fkey" FOREIGN KEY ("jurisdiction") REFERENCES "Jurisdiction"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Court" ("jurisdiction", "code") VALUES
    ('SA', 'general'),
    ('SA', 'criminal'),
    ('SA', 'personal_status'),
    ('SA', 'labor'),
    ('SA', 'commercial'),
    ('SA', 'enforcement'),
    ('SA', 'administrative'),
    ('SA', 'appeal'),
    ('SA', 'supreme');
