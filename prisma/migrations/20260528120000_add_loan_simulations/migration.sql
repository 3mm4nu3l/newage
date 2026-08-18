CREATE TABLE IF NOT EXISTS "LoanSimulation" (
  "id" TEXT NOT NULL,
  "projectAmountCents" INTEGER NOT NULL,
  "contributionCents" INTEGER NOT NULL,
  "annualIncomeCents" INTEGER NOT NULL,
  "annualChargesCents" INTEGER NOT NULL,
  "borrowerCount" INTEGER NOT NULL,
  "ageRetained" INTEGER NOT NULL,
  "durationMonths" INTEGER NOT NULL,
  "dpeGroup" "DpeGroup" NOT NULL DEFAULT 'ANY',
  "rateType" TEXT NOT NULL,
  "recommendationJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoanSimulation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SimulationBorrower" (
  "id" TEXT NOT NULL,
  "simulationId" TEXT NOT NULL,
  "civility" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3) NOT NULL,
  "mobile" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SimulationBorrower_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoanSimulation_createdAt_idx" ON "LoanSimulation"("createdAt");
CREATE INDEX IF NOT EXISTS "SimulationBorrower_simulationId_idx" ON "SimulationBorrower"("simulationId");
CREATE INDEX IF NOT EXISTS "SimulationBorrower_email_idx" ON "SimulationBorrower"("email");

ALTER TABLE "SimulationBorrower"
  ADD CONSTRAINT "SimulationBorrower_simulationId_fkey"
  FOREIGN KEY ("simulationId") REFERENCES "LoanSimulation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
