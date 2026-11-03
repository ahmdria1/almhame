CREATE TABLE "DraftCheckFailure" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL DEFAULT '',
    "articleNumber" TEXT NOT NULL DEFAULT '',
    "statute" TEXT NOT NULL DEFAULT '',
    "modelId" TEXT NOT NULL DEFAULT '',
    "attempt" INTEGER NOT NULL,
    "failureType" TEXT NOT NULL,
    "quoteSpan" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftCheckFailure_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DraftCheckFailure_createdAt_idx" ON "DraftCheckFailure"("createdAt");
