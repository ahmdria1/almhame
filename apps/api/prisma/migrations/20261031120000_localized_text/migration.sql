CREATE TABLE "LocalizedText" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LocalizedText_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocalizedText_scope_sourceId_locale_key" ON "LocalizedText"("scope", "sourceId", "locale");
CREATE INDEX "LocalizedText_scope_sourceId_idx" ON "LocalizedText"("scope", "sourceId");

CREATE TABLE "AdminNotice" (
    "id" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminNotice_pkey" PRIMARY KEY ("id")
);
