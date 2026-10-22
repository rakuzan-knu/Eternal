ALTER TABLE "PendingMediaObject" ADD COLUMN "bucket" TEXT;

CREATE TABLE "private_media_objects" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "readyAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "private_media_objects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "private_media_size_positive" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 20971520)
);
CREATE UNIQUE INDEX "private_media_objects_key_key" ON "private_media_objects"("key");
CREATE INDEX "private_media_objects_conversationId_ownerId_idx" ON "private_media_objects"("conversationId", "ownerId");
