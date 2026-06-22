ALTER TABLE "Absence" ADD COLUMN "requestId" TEXT;

CREATE UNIQUE INDEX "Absence_requestId_key" ON "Absence"("requestId");

ALTER TABLE "Absence"
ADD CONSTRAINT "Absence_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "HrRequest"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
