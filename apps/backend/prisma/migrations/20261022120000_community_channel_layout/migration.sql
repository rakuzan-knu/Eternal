ALTER TABLE "communities" ADD COLUMN "channelRevision" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "community_categories" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "community_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_categories_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "community_categories_id_communityId_key" ON "community_categories"("id", "communityId");
CREATE INDEX "community_categories_communityId_position_id_idx" ON "community_categories"("communityId", "position", "id");
ALTER TABLE "community_channels" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "community_channels" ADD CONSTRAINT "community_channels_categoryId_communityId_fkey" FOREIGN KEY ("categoryId", "communityId") REFERENCES "community_categories"("id", "communityId") ON DELETE NO ACTION ON UPDATE NO ACTION;
