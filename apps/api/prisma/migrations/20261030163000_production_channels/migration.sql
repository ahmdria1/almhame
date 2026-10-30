ALTER TABLE "User" ADD COLUMN "expoPushToken" TEXT;

CREATE TABLE "NafathRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transId" TEXT NOT NULL,
    "randomCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NafathRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NafathRequest_userId_createdAt_idx" ON "NafathRequest"("userId", "createdAt");
ALTER TABLE "NafathRequest" ADD CONSTRAINT "NafathRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
