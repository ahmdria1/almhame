CREATE TABLE "TokenLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "degraded" BOOLEAN NOT NULL DEFAULT false,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TokenLedger_userId_period_idx" ON "TokenLedger"("userId", "period");
CREATE INDEX "TokenLedger_period_planCode_idx" ON "TokenLedger"("period", "planCode");
