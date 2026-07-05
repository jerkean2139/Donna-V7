CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "cognitive_objects" ADD COLUMN "embedding" vector(512);--> statement-breakpoint
CREATE INDEX "cognitive_objects_embedding_hnsw_idx" ON "cognitive_objects" USING hnsw ("embedding" vector_cosine_ops);