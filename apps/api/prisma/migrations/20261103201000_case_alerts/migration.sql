-- Backup the database before applying this migration.
-- It adds TrackedCase, CaseFiling, CourtNotice, and NotificationPreference.
-- It does not change Memo, Message, or CaseFile.

CREATE TABLE "TrackedCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseKey" TEXT NOT NULL,
    "caseNumberEnc" TEXT NOT NULL,
    "court" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_link',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrackedCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseFiling" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "titleEnc" TEXT NOT NULL,
    "filerEnc" TEXT NOT NULL,
    "filedAt" TIMESTAMP(3) NOT NULL,
    "responseDeadline" TIMESTAMP(3),
    "sourceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseFiling_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourtNotice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourtNotice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "TrackedCase_userId_caseKey_key" ON "TrackedCase"("userId", "caseKey");
CREATE INDEX "TrackedCase_caseKey_idx" ON "TrackedCase"("caseKey");
CREATE UNIQUE INDEX "CaseFiling_caseId_externalId_key" ON "CaseFiling"("caseId", "externalId");
CREATE INDEX "CaseFiling_caseId_filedAt_idx" ON "CaseFiling"("caseId", "filedAt");
CREATE UNIQUE INDEX "CourtNotice_filingId_key" ON "CourtNotice"("filingId");
CREATE INDEX "CourtNotice_userId_createdAt_idx" ON "CourtNotice"("userId", "createdAt");

ALTER TABLE "TrackedCase" ADD CONSTRAINT "TrackedCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseFiling" ADD CONSTRAINT "CaseFiling_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "TrackedCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourtNotice" ADD CONSTRAINT "CourtNotice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourtNotice" ADD CONSTRAINT "CourtNotice_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "CaseFiling"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
