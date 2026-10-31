-- Office subscribers keep a paid window on the nearest remaining plan.
UPDATE "User" SET "planCode" = 'pro' WHERE "planCode" = 'office';
UPDATE "PaymentIntent" SET "planCode" = 'pro' WHERE "planCode" = 'office';
DELETE FROM "PlanSetting" WHERE "code" = 'office';

ALTER TYPE "PlanCode" RENAME TO "PlanCode_old";
CREATE TYPE "PlanCode" AS ENUM ('free', 'basic', 'pro');

ALTER TABLE "User" ALTER COLUMN "planCode" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "planCode" TYPE "PlanCode" USING ("planCode"::text::"PlanCode");
ALTER TABLE "User" ALTER COLUMN "planCode" SET DEFAULT 'free';

ALTER TABLE "PaymentIntent" ALTER COLUMN "planCode" TYPE "PlanCode" USING ("planCode"::text::"PlanCode");
ALTER TABLE "PlanSetting" ALTER COLUMN "code" TYPE "PlanCode" USING ("code"::text::"PlanCode");

DROP TYPE "PlanCode_old";

ALTER TABLE "User" RENAME COLUMN "planRenewsAt" TO "planExpiresAt";
ALTER TABLE "User" ADD COLUMN "notLawyerDeclaredAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "nationalIdEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "planReminderKey" TEXT;

CREATE TYPE "SoundMode" AS ENUM ('all', 'urgent', 'off');
ALTER TABLE "User" ADD COLUMN "soundMode" "SoundMode" NOT NULL DEFAULT 'all';

ALTER TABLE "Chat" ADD COLUMN "clientLocale" TEXT NOT NULL DEFAULT 'ar';
ALTER TABLE "Document" ADD COLUMN "pageCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Memo" ADD COLUMN "summaryEnc" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Notification" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'hearing';
ALTER TABLE "Notification" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "Notification" ADD COLUMN "titleEnc" TEXT NOT NULL DEFAULT '';

ALTER TABLE "PlanSetting" ADD COLUMN "validityDays" INTEGER NOT NULL DEFAULT 30;

UPDATE "PlanSetting"
SET "priceHalalas" = 0, "memoLimit" = 1, "chatLimit" = NULL, "validityDays" = 0
WHERE "code" = 'free';
UPDATE "PlanSetting"
SET "priceHalalas" = 3900, "memoLimit" = 15, "chatLimit" = NULL, "validityDays" = 30
WHERE "code" = 'basic';
UPDATE "PlanSetting"
SET "priceHalalas" = 11900, "memoLimit" = 50, "chatLimit" = NULL, "validityDays" = 30
WHERE "code" = 'pro';

ALTER TYPE "HearingKind" ADD VALUE 'appeal_deadline';

CREATE TABLE "CaseAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "court" TEXT NOT NULL DEFAULT 'general',
    "factsEnc" TEXT NOT NULL,
    "resultEnc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseAssessment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaseAssessment_userId_createdAt_idx" ON "CaseAssessment"("userId", "createdAt");

ALTER TABLE "CaseAssessment"
ADD CONSTRAINT "CaseAssessment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HearingPrep" (
    "memoId" TEXT NOT NULL,
    "bodyEnc" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HearingPrep_pkey" PRIMARY KEY ("memoId")
);

ALTER TABLE "HearingPrep"
ADD CONSTRAINT "HearingPrep_memoId_fkey"
FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
