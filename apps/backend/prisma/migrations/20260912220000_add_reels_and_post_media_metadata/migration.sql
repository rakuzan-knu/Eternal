-- AlterTable PostMedia
ALTER TABLE "PostMedia" ADD COLUMN IF NOT EXISTS "blurhash" TEXT;
ALTER TABLE "PostMedia" ADD COLUMN IF NOT EXISTS "thumbhash" TEXT;
ALTER TABLE "PostMedia" ADD COLUMN IF NOT EXISTS "hls_url" TEXT;

-- CreateEnum FolderFilterType
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FolderFilterType') THEN
        CREATE TYPE "FolderFilterType" AS ENUM ('ALL', 'PERSONAL', 'WORK', 'GROUPS', 'CHANNELS', 'UNREAD', 'CUSTOM');
    END IF;
END $$;

-- CreateTable chat_folders
CREATE TABLE IF NOT EXISTS "chat_folders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "emoji" TEXT,
    "color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "filter_type" "FolderFilterType" NOT NULL DEFAULT 'CUSTOM',
    "include_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclude_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_folders_user_id_order_idx" ON "chat_folders"("user_id", "order");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_folders_user_id_fkey') THEN
        ALTER TABLE "chat_folders" ADD CONSTRAINT "chat_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable user_prekey_bundles
CREATE TABLE IF NOT EXISTS "user_prekey_bundles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "identity_key_spki" TEXT NOT NULL,
    "signed_prekey_spki" TEXT NOT NULL,
    "signed_prekey_sig" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_prekey_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_prekey_bundles_user_id_key" ON "user_prekey_bundles"("user_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_prekey_bundles_user_id_fkey') THEN
        ALTER TABLE "user_prekey_bundles" ADD CONSTRAINT "user_prekey_bundles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable user_one_time_prekeys
CREATE TABLE IF NOT EXISTS "user_one_time_prekeys" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "key_id" INTEGER NOT NULL,
    "key_spki" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_one_time_prekeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_one_time_prekeys_bundle_id_key_id_key" ON "user_one_time_prekeys"("bundle_id", "key_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_one_time_prekeys_bundle_id_fkey') THEN
        ALTER TABLE "user_one_time_prekeys" ADD CONSTRAINT "user_one_time_prekeys_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "user_prekey_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable reels
CREATE TABLE IF NOT EXISTS "reels" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "video_url" TEXT NOT NULL,
    "hls_url" TEXT,
    "thumbnail_url" TEXT,
    "blurhash" TEXT,
    "thumbhash" TEXT,
    "duration" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "audio_title" TEXT,
    "audio_artist" TEXT,
    "audio_url" TEXT,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "shares_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reels_author_id_created_at_idx" ON "reels"("author_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "reels_created_at_idx" ON "reels"("created_at" DESC);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reels_author_id_fkey') THEN
        ALTER TABLE "reels" ADD CONSTRAINT "reels_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable reel_likes
CREATE TABLE IF NOT EXISTS "reel_likes" (
    "id" TEXT NOT NULL,
    "reel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "reel_likes_reel_id_user_id_key" ON "reel_likes"("reel_id", "user_id");
CREATE INDEX IF NOT EXISTS "reel_likes_user_id_idx" ON "reel_likes"("user_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reel_likes_reel_id_fkey') THEN
        ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reel_likes_user_id_fkey') THEN
        ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable reel_comments
CREATE TABLE IF NOT EXISTS "reel_comments" (
    "id" TEXT NOT NULL,
    "reel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reel_comments_reel_id_created_at_idx" ON "reel_comments"("reel_id", "created_at" ASC);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reel_comments_reel_id_fkey') THEN
        ALTER TABLE "reel_comments" ADD CONSTRAINT "reel_comments_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reel_comments_user_id_fkey') THEN
        ALTER TABLE "reel_comments" ADD CONSTRAINT "reel_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
