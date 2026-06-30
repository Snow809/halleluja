-- Remove sensitive employee identifiers from the relational profile.
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "cinNumber";
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "cnssNumber";
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "insuranceCompany";
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "insurancePolicyNumber";

-- Aggregate-only QVT model inputs. These are never exposed on employee detail endpoints.
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "companyType" TEXT NOT NULL DEFAULT 'SERVICE';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "wfhSetupAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "designationLevel" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "resourceAllocationScore" DECIMAL(4,2) NOT NULL DEFAULT 5.0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "mentalFatigueScore" DECIMAL(4,2) NOT NULL DEFAULT 5.0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "jobSatisfactionScore" DECIMAL(4,2) NOT NULL DEFAULT 6.0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "workLifeBalanceScore" DECIMAL(4,2) NOT NULL DEFAULT 6.0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "managerSupportScore" DECIMAL(4,2) NOT NULL DEFAULT 6.0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "recognitionScore" DECIMAL(4,2) NOT NULL DEFAULT 6.0;

-- Link generated PDFs to the source request so transient-only form values are not needed later.
ALTER TABLE "GeneratedDocument" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "GeneratedDocument_requestId_key" ON "GeneratedDocument"("requestId") WHERE "requestId" IS NOT NULL;
DO $$ BEGIN
  ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "HrRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop removed admin debug/settings table if it exists locally.
DROP TABLE IF EXISTS "AppSetting";

-- Individual wellbeing alerts are replaced by aggregate-only QVT snapshots.
DROP TABLE IF EXISTS "EmployeeRiskAlert";
DROP TYPE IF EXISTS "RiskLevel";

DO $$ BEGIN
  CREATE TYPE "QvtScopeType" AS ENUM ('COMPANY', 'DEPARTMENT', 'TEAM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "QvtPredictionSnapshot" (
  "id" TEXT NOT NULL,
  "scopeType" "QvtScopeType" NOT NULL,
  "scopeId" TEXT,
  "employeeCount" INTEGER NOT NULL,
  "averageBurnoutRisk" DECIMAL(5,2),
  "averageDisengagementRisk" DECIMAL(5,2),
  "riskDistribution" JSONB NOT NULL DEFAULT '{}',
  "topDrivers" JSONB NOT NULL DEFAULT '[]',
  "recommendation" TEXT NOT NULL,
  "modelVersion" TEXT,
  "trainedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QvtPredictionSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QvtPredictionSnapshot_scopeType_scopeId_createdAt_idx" ON "QvtPredictionSnapshot"("scopeType", "scopeId", "createdAt");
