ALTER TABLE "SimulationBorrower" RENAME TO "Borrower";

CREATE TABLE IF NOT EXISTS "LoanSimulationBorrower" (
  "id" TEXT NOT NULL,
  "simulationId" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoanSimulationBorrower_pkey" PRIMARY KEY ("id")
);

INSERT INTO "LoanSimulationBorrower" ("id", "simulationId", "borrowerId", "createdAt")
SELECT
  'lsb_' || md5(random()::text || clock_timestamp()::text || "id"),
  "simulationId",
  "id",
  COALESCE("createdAt", CURRENT_TIMESTAMP)
FROM "Borrower"
WHERE "simulationId" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "Borrower" DROP CONSTRAINT IF EXISTS "SimulationBorrower_simulationId_fkey";
DROP INDEX IF EXISTS "SimulationBorrower_simulationId_idx";
DROP INDEX IF EXISTS "SimulationBorrower_email_idx";
ALTER TABLE "Borrower" DROP COLUMN IF EXISTS "simulationId";

CREATE UNIQUE INDEX IF NOT EXISTS "Borrower_email_key" ON "Borrower"("email");
CREATE INDEX IF NOT EXISTS "Borrower_email_idx" ON "Borrower"("email");
CREATE INDEX IF NOT EXISTS "LoanSimulationBorrower_borrowerId_idx" ON "LoanSimulationBorrower"("borrowerId");
CREATE INDEX IF NOT EXISTS "LoanSimulationBorrower_simulationId_idx" ON "LoanSimulationBorrower"("simulationId");
CREATE UNIQUE INDEX IF NOT EXISTS "LoanSimulationBorrower_simulationId_borrowerId_key" ON "LoanSimulationBorrower"("simulationId", "borrowerId");

ALTER TABLE "LoanSimulationBorrower"
  ADD CONSTRAINT "LoanSimulationBorrower_simulationId_fkey"
  FOREIGN KEY ("simulationId") REFERENCES "LoanSimulation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoanSimulationBorrower"
  ADD CONSTRAINT "LoanSimulationBorrower_borrowerId_fkey"
  FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
