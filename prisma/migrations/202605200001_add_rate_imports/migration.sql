CREATE TYPE "RateImportStatus" AS ENUM ('PROCESSING', 'DRAFT_CREATED', 'FAILED');

CREATE TABLE "RateImport" (
    "id" TEXT NOT NULL,
    "rateSheetId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mistral',
    "providerModel" TEXT NOT NULL DEFAULT 'mistral-ocr-latest',
    "status" "RateImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "markdown" TEXT,
    "extractedRules" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateImport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RateImport_rateSheetId_idx" ON "RateImport"("rateSheetId");
CREATE INDEX "RateImport_createdAt_idx" ON "RateImport"("createdAt");

ALTER TABLE "RateImport" ADD CONSTRAINT "RateImport_rateSheetId_fkey" FOREIGN KEY ("rateSheetId") REFERENCES "RateSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
