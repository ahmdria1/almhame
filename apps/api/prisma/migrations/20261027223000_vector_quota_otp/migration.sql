ALTER TABLE "User" ADD COLUMN "chatCountPeriod" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "OtpChallenge" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CorpusEmbedding"
  ALTER COLUMN "embedding" TYPE vector(384)
  USING "embedding"::vector(384);

CREATE INDEX "CorpusEmbedding_embedding_hnsw"
  ON "CorpusEmbedding"
  USING hnsw ("embedding" vector_cosine_ops);
