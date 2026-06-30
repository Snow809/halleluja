CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "DocumentChunk"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536),
ADD COLUMN IF NOT EXISTS "embeddingModel" TEXT;

CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_ivfflat_idx"
ON "DocumentChunk"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100)
WHERE "embedding" IS NOT NULL;
