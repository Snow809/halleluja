CREATE EXTENSION IF NOT EXISTS vector;

DELETE FROM "DocumentChunk";

DROP INDEX IF EXISTS "DocumentChunk_embedding_ivfflat_idx";

ALTER TABLE "DocumentChunk"
DROP COLUMN IF EXISTS "embedding";

ALTER TABLE "DocumentChunk"
ADD COLUMN "embedding" vector(384);

CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_ivfflat_idx"
ON "DocumentChunk"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100)
WHERE "embedding" IS NOT NULL;
