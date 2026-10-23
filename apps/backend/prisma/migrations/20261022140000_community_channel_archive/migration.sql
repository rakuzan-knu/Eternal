-- Additive; retain the column and history when rolling application code back.
ALTER TABLE "community_channels" ADD COLUMN "archivedAt" TIMESTAMP(3);
