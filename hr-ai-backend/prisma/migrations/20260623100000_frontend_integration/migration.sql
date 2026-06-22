CREATE TYPE "NotificationType" AS ENUM ('REQUEST', 'DOCUMENT', 'ONBOARDING', 'ALERT', 'SYSTEM');
CREATE TYPE "HrContactStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

ALTER TABLE "HrRequest"
ADD COLUMN "attachmentPath" TEXT,
ADD COLUMN "attachmentName" TEXT,
ADD COLUMN "attachmentType" TEXT,
ADD COLUMN "attachmentSize" INTEGER;

ALTER TABLE "EmployeeRiskAlert"
ADD COLUMN "followUpNote" TEXT,
ADD COLUMN "followUpAt" TIMESTAMP(3);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_readAt_createdAt_idx"
ON "Notification"("userId", "readAt", "createdAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HrContactRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "message" TEXT NOT NULL,
  "status" "HrContactStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HrContactRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HrContactRequest_status_createdAt_idx"
ON "HrContactRequest"("status", "createdAt");

ALTER TABLE "HrContactRequest" ADD CONSTRAINT "HrContactRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
