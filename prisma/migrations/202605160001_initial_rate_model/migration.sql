-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RateSheetStatus" AS ENUM ('DRAFT', 'VERIFIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('PROSPECT', 'CLIENT', 'ALL');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('RP', 'RS', 'RL', 'LMNP', 'BRS', 'PSLA', 'CONSTRUCTION', 'WORKS', 'OTHER');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('AMORTIZING', 'IN_FINE', 'BRIDGE_TOTAL', 'BRIDGE_PARTIAL', 'VARIABLE', 'TVA_ADVANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "BorrowerType" AS ENUM ('SINGLE', 'COUPLE', 'SCI', 'OTHER');

-- CreateEnum
CREATE TYPE "DpeGroup" AS ENUM ('A_B', 'A_B_C_D_NEW', 'A_B_C', 'A_TO_D', 'E_F_G_NONE', 'ANY');

-- CreateEnum
CREATE TYPE "AdjustmentKind" AS ENUM ('DISCOUNT', 'SURCHARGE');

-- CreateEnum
CREATE TYPE "ConditionOperator" AS ENUM ('EQ', 'IN', 'GTE', 'LTE', 'RANGE', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "AchievedRateSource" AS ENUM ('BROKER_DECLARATION', 'BANK_OFFER', 'CRM_DEAL', 'MANUAL_IMPORT');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "Bank" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "logoPath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "crmUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateSheet" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sourcePath" TEXT,
    "status" "RateSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateRule" (
    "id" TEXT NOT NULL,
    "rateSheetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "profileLabel" TEXT,
    "customerType" "CustomerType" NOT NULL DEFAULT 'ALL',
    "projectType" "ProjectType",
    "loanType" "LoanType" NOT NULL DEFAULT 'AMORTIZING',
    "borrowerType" "BorrowerType",
    "durationMinMonths" INTEGER,
    "durationMaxMonths" INTEGER,
    "incomeMinSingleCents" INTEGER,
    "incomeMaxSingleCents" INTEGER,
    "incomeMinCoupleCents" INTEGER,
    "incomeMaxCoupleCents" INTEGER,
    "contributionMinBps" INTEGER,
    "contributionMaxBps" INTEGER,
    "dpeGroup" "DpeGroup" NOT NULL DEFAULT 'ANY',
    "tapMinBps" INTEGER,
    "tapMaxBps" INTEGER,
    "amountMinCents" INTEGER,
    "amountMaxCents" INTEGER,
    "baseRateBps" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "rawCriteria" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateAdjustment" (
    "id" TEXT NOT NULL,
    "rateSheetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "AdjustmentKind" NOT NULL,
    "adjustmentBps" INTEGER NOT NULL,
    "conditionKey" TEXT NOT NULL,
    "operator" "ConditionOperator" NOT NULL DEFAULT 'EQ',
    "value" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isStackable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityRule" (
    "id" TEXT NOT NULL,
    "rateSheetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "conditionKey" TEXT NOT NULL,
    "operator" "ConditionOperator" NOT NULL DEFAULT 'EQ',
    "value" JSONB NOT NULL,
    "isBlocking" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EligibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateDisplayBlock" (
    "id" TEXT NOT NULL,
    "rateSheetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateDisplayBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievedRate" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "brokerId" TEXT,
    "crmDealId" TEXT,
    "achievedAt" TIMESTAMP(3) NOT NULL,
    "rateObtainedBps" INTEGER NOT NULL,
    "loanDurationMonths" INTEGER NOT NULL,
    "loanAmountCents" INTEGER,
    "projectAmountCents" INTEGER,
    "contributionAmountCents" INTEGER,
    "contributionBps" INTEGER,
    "projectType" "ProjectType",
    "loanType" "LoanType" NOT NULL DEFAULT 'AMORTIZING',
    "customerType" "CustomerType" NOT NULL DEFAULT 'ALL',
    "borrowerType" "BorrowerType",
    "borrowerProfileLabel" TEXT,
    "incomeTotalCents" INTEGER,
    "incomeBandLabel" TEXT,
    "borrowerCount" INTEGER,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "dpeGroup" "DpeGroup" NOT NULL DEFAULT 'ANY',
    "region" TEXT,
    "professionalStatus" TEXT,
    "sourceType" "AchievedRateSource" NOT NULL DEFAULT 'BROKER_DECLARATION',
    "confidenceLevel" "ConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AchievedRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bank_slug_key" ON "Bank"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Broker_email_key" ON "Broker"("email");

-- CreateIndex
CREATE INDEX "RateSheet_bankId_effectiveDate_idx" ON "RateSheet"("bankId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "RateSheet_bankId_month_title_key" ON "RateSheet"("bankId", "month", "title");

-- CreateIndex
CREATE INDEX "RateRule_rateSheetId_customerType_loanType_idx" ON "RateRule"("rateSheetId", "customerType", "loanType");

-- CreateIndex
CREATE INDEX "RateRule_durationMinMonths_durationMaxMonths_idx" ON "RateRule"("durationMinMonths", "durationMaxMonths");

-- CreateIndex
CREATE INDEX "RateRule_incomeMinSingleCents_incomeMaxSingleCents_idx" ON "RateRule"("incomeMinSingleCents", "incomeMaxSingleCents");

-- CreateIndex
CREATE INDEX "RateRule_incomeMinCoupleCents_incomeMaxCoupleCents_idx" ON "RateRule"("incomeMinCoupleCents", "incomeMaxCoupleCents");

-- CreateIndex
CREATE INDEX "RateAdjustment_rateSheetId_conditionKey_idx" ON "RateAdjustment"("rateSheetId", "conditionKey");

-- CreateIndex
CREATE INDEX "EligibilityRule_rateSheetId_conditionKey_idx" ON "EligibilityRule"("rateSheetId", "conditionKey");

-- CreateIndex
CREATE INDEX "RateDisplayBlock_rateSheetId_order_idx" ON "RateDisplayBlock"("rateSheetId", "order");

-- CreateIndex
CREATE INDEX "AchievedRate_bankId_achievedAt_idx" ON "AchievedRate"("bankId", "achievedAt");

-- CreateIndex
CREATE INDEX "AchievedRate_bankId_loanDurationMonths_contributionBps_idx" ON "AchievedRate"("bankId", "loanDurationMonths", "contributionBps");

-- CreateIndex
CREATE INDEX "AchievedRate_projectType_loanType_customerType_idx" ON "AchievedRate"("projectType", "loanType", "customerType");

-- CreateIndex
CREATE INDEX "AchievedRate_incomeTotalCents_dpeGroup_idx" ON "AchievedRate"("incomeTotalCents", "dpeGroup");

-- AddForeignKey
ALTER TABLE "RateSheet" ADD CONSTRAINT "RateSheet_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRule" ADD CONSTRAINT "RateRule_rateSheetId_fkey" FOREIGN KEY ("rateSheetId") REFERENCES "RateSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateAdjustment" ADD CONSTRAINT "RateAdjustment_rateSheetId_fkey" FOREIGN KEY ("rateSheetId") REFERENCES "RateSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityRule" ADD CONSTRAINT "EligibilityRule_rateSheetId_fkey" FOREIGN KEY ("rateSheetId") REFERENCES "RateSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDisplayBlock" ADD CONSTRAINT "RateDisplayBlock_rateSheetId_fkey" FOREIGN KEY ("rateSheetId") REFERENCES "RateSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievedRate" ADD CONSTRAINT "AchievedRate_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievedRate" ADD CONSTRAINT "AchievedRate_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
