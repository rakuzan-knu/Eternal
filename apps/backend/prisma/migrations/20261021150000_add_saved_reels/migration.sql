-- Additive rollout: apply on core before deploying the reels service and web client.
-- Keep this table on rollback; older releases safely ignore it. No backfill is required.
CREATE TABLE "saved_reels" (
  "id" TEXT NOT NULL,
  "reel_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saved_reels_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "saved_reels_reel_id_user_id_key" ON "saved_reels"("reel_id", "user_id");
CREATE INDEX "saved_reels_user_id_created_at_id_idx" ON "saved_reels"("user_id", "created_at", "id");
ALTER TABLE "saved_reels" ADD CONSTRAINT "saved_reels_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_reels" ADD CONSTRAINT "saved_reels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
