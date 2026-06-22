CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "fileType" TEXT NOT NULL DEFAULT 'DOCX',
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "HrRequest" ADD COLUMN "templateId" TEXT;

ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_uploadedBy_fkey"
FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HrRequest" ADD CONSTRAINT "HrRequest_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
