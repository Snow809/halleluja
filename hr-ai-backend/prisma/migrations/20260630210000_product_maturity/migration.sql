CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');
CREATE TYPE "HrRequestCommentVisibility" AS ENUM ('PUBLIC', 'INTERNAL');
CREATE TYPE "DocumentIndexStatus" AS ENUM ('NOT_INDEXED', 'INDEXING', 'INDEXED', 'FAILED');

ALTER TABLE "Notification"
  ADD COLUMN "actionUrl" TEXT,
  ADD COLUMN "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL';

ALTER TABLE "HrDocument"
  ADD COLUMN "indexedStatus" "DocumentIndexStatus" NOT NULL DEFAULT 'NOT_INDEXED',
  ADD COLUMN "indexedAt" TIMESTAMP(3),
  ADD COLUMN "indexError" TEXT;

CREATE TABLE "HrRequestComment" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "visibility" "HrRequestCommentVisibility" NOT NULL DEFAULT 'PUBLIC',
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HrRequestComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HrRequestComment_requestId_createdAt_idx" ON "HrRequestComment"("requestId", "createdAt");

ALTER TABLE "HrRequestComment"
  ADD CONSTRAINT "HrRequestComment_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "HrRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HrRequestComment"
  ADD CONSTRAINT "HrRequestComment_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AppSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

UPDATE "HrDocument" d
SET
  "indexedStatus" = CASE WHEN EXISTS (
    SELECT 1 FROM "DocumentChunk" c WHERE c."documentId" = d."id"
  ) THEN 'INDEXED'::"DocumentIndexStatus" ELSE 'NOT_INDEXED'::"DocumentIndexStatus" END,
  "indexedAt" = CASE WHEN EXISTS (
    SELECT 1 FROM "DocumentChunk" c WHERE c."documentId" = d."id"
  ) THEN d."createdAt" ELSE NULL END;
