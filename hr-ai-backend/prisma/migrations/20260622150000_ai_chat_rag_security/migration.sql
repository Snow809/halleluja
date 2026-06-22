CREATE TYPE "DocumentVisibility" AS ENUM ('PUBLIC', 'ROLE_RESTRICTED', 'EMPLOYEE_PRIVATE');
CREATE TYPE "AiActionType" AS ENUM ('CREATE_LEAVE_REQUEST', 'CREATE_DOCUMENT_REQUEST', 'REVIEW_HR_REQUEST', 'COMPLETE_ONBOARDING_STEP');
CREATE TYPE "AiActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'FAILED');

ALTER TABLE "HrDocument"
ADD COLUMN "visibility" "DocumentVisibility" NOT NULL DEFAULT 'ROLE_RESTRICTED',
ADD COLUMN "allowedRoles" TEXT[] NOT NULL DEFAULT ARRAY['ADMIN', 'HR']::TEXT[];

UPDATE "HrDocument"
SET "visibility" = CASE
  WHEN "isPublic" = true THEN 'PUBLIC'::"DocumentVisibility"
  WHEN "employeeId" IS NOT NULL THEN 'EMPLOYEE_PRIVATE'::"DocumentVisibility"
  ELSE 'ROLE_RESTRICTED'::"DocumentVisibility"
END;

ALTER TABLE "DocumentChunk"
ADD COLUMN "chunkOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sourcePage" INTEGER;

ALTER TABLE "WorkflowTask" ADD COLUMN "completionNote" TEXT;
ALTER TABLE "Employee" ADD COLUMN "rttBalanceDays" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "AuditLog" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "SecurityAlert"
ADD COLUMN "title" TEXT,
ADD COLUMN "message" TEXT,
ADD COLUMN "targetId" TEXT;
ALTER TABLE "AiMessage" ADD COLUMN "sources" JSONB;

CREATE TABLE "AiActionDraft" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "actionType" "AiActionType" NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "AiActionStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "executedAt" TIMESTAMP(3),
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiActionDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiActionDraft_createdBy_status_idx" ON "AiActionDraft"("createdBy", "status");
CREATE INDEX "AiActionDraft_expiresAt_idx" ON "AiActionDraft"("expiresAt");

ALTER TABLE "AiActionDraft" ADD CONSTRAINT "AiActionDraft_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiActionDraft" ADD CONSTRAINT "AiActionDraft_createdBy_fkey"
FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
