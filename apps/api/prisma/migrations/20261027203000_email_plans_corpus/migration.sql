ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

ALTER TABLE "OtpChallenge" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "OtpChallenge" ADD COLUMN "adminId" TEXT;
ALTER TABLE "OtpChallenge" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'email_verify';
CREATE INDEX "OtpChallenge_adminId_idx" ON "OtpChallenge"("adminId");
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminAccount" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

ALTER TABLE "Law" ADD COLUMN "issuedHijri" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Law" ADD COLUMN "publishedHijri" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Law" ADD COLUMN "statusLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Law" ALTER COLUMN "isSample" SET DEFAULT false;
ALTER TABLE "Article" ALTER COLUMN "isSample" SET DEFAULT false;
ALTER TABLE "ShariaSource" ALTER COLUMN "isSample" SET DEFAULT false;

CREATE TABLE "PlanSetting" (
    "code" "PlanCode" NOT NULL,
    "priceHalalas" INTEGER NOT NULL,
    "memoLimit" INTEGER NOT NULL,
    "chatLimit" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanSetting_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "laws" INTEGER NOT NULL DEFAULT 0,
    "articles" INTEGER NOT NULL DEFAULT 0,
    "sharia" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);
