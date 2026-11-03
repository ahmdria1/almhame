ALTER TABLE "User" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
UPDATE "User" SET "referralCode" = "id" WHERE "referralCode" IS NULL;
ALTER TABLE "User" ALTER COLUMN "referralCode" SET NOT NULL;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

CREATE TABLE "SearchBlind" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchBlind_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SearchBlind_userId_kind_entityId_token_key" ON "SearchBlind"("userId", "kind", "entityId", "token");
CREATE INDEX "SearchBlind_userId_token_idx" ON "SearchBlind"("userId", "token");

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");

CREATE TABLE "ProblemReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageEnc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProblemReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProblemReport_userId_idx" ON "ProblemReport"("userId");

CREATE TABLE "PendingUpdate" (
    "id" TEXT NOT NULL,
    "lawKey" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PendingUpdate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PendingUpdate_status_idx" ON "PendingUpdate"("status");
