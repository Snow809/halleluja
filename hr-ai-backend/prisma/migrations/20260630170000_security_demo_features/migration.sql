ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT,
ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "termsVersion" TEXT,
ADD COLUMN IF NOT EXISTS "consents" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "GeneratedDocument"
ADD COLUMN IF NOT EXISTS "clearFilePath" TEXT,
ADD COLUMN IF NOT EXISTS "anonymizedFilePath" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DataErasureStatus') THEN
    CREATE TYPE "DataErasureStatus" AS ENUM ('PENDING', 'APPROVED_FOR_FUTURE_PURGE', 'CANCELLED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "DataErasureRequest" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "status" "DataErasureStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),

  CONSTRAINT "DataErasureRequest_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DataErasureRequest_employeeId_fkey'
  ) THEN
    ALTER TABLE "DataErasureRequest"
    ADD CONSTRAINT "DataErasureRequest_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DataErasureRequest_requesterId_fkey'
  ) THEN
    ALTER TABLE "DataErasureRequest"
    ADD CONSTRAINT "DataErasureRequest_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DataErasureRequest_reviewerId_fkey'
  ) THEN
    ALTER TABLE "DataErasureRequest"
    ADD CONSTRAINT "DataErasureRequest_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "DataErasureRequest_status_createdAt_idx"
ON "DataErasureRequest"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "DataErasureRequest_employeeId_status_idx"
ON "DataErasureRequest"("employeeId", "status");
