-- Additive migration. Keep MEDIA_ORPHAN_CLEANUP_ENABLED=false until every
-- consuming service supports atomic retention claims for registered objects.
CREATE TYPE "PendingMediaState" AS ENUM ('PENDING', 'RETAINED', 'DELETING', 'DELETED');
CREATE TABLE "PendingMediaObject" (
    "key" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "state" "PendingMediaState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "PendingMediaObject_pkey" PRIMARY KEY ("key")
);
CREATE UNIQUE INDEX "PendingMediaObject_uploadId_key" ON "PendingMediaObject"("uploadId");
CREATE INDEX "PendingMediaObject_state_createdAt_idx" ON "PendingMediaObject"("state", "createdAt");
CREATE INDEX "PendingMediaObject_state_deletedAt_idx" ON "PendingMediaObject"("state", "deletedAt");
