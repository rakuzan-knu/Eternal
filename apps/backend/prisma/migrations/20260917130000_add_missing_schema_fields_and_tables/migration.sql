-- AlterTable MessageAttachment
ALTER TABLE "MessageAttachment" ADD COLUMN IF NOT EXISTS "waveform" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable profile_showcases
ALTER TABLE "profile_showcases" ADD COLUMN IF NOT EXISTS "widget_order" JSONB;

-- CreateTable user_liked_tracks
CREATE TABLE IF NOT EXISTS "user_liked_tracks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "album_art" TEXT,
    "duration_ms" INTEGER NOT NULL DEFAULT 180000,
    "preview_url" TEXT,
    "stream_url" TEXT,
    "spotify_url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'soundcloud',
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_liked_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_liked_tracks_user_id_track_id_key" ON "user_liked_tracks"("user_id", "track_id");
CREATE INDEX IF NOT EXISTS "user_liked_tracks_user_id_added_at_idx" ON "user_liked_tracks"("user_id", "added_at" DESC);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_liked_tracks_user_id_fkey') THEN
        ALTER TABLE "user_liked_tracks" ADD CONSTRAINT "user_liked_tracks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable user_music_folders
CREATE TABLE IF NOT EXISTS "user_music_folders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_music_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_music_folders_user_id_created_at_idx" ON "user_music_folders"("user_id", "created_at" ASC);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_music_folders_user_id_fkey') THEN
        ALTER TABLE "user_music_folders" ADD CONSTRAINT "user_music_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable user_playlists
CREATE TABLE IF NOT EXISTS "user_playlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_playlists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_playlists_user_id_created_at_idx" ON "user_playlists"("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "user_playlists_folder_id_idx" ON "user_playlists"("folder_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_playlists_user_id_fkey') THEN
        ALTER TABLE "user_playlists" ADD CONSTRAINT "user_playlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_playlists_folder_id_fkey') THEN
        ALTER TABLE "user_playlists" ADD CONSTRAINT "user_playlists_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "user_music_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable user_playlist_tracks
CREATE TABLE IF NOT EXISTS "user_playlist_tracks" (
    "id" TEXT NOT NULL,
    "playlist_id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "album_art" TEXT,
    "duration_ms" INTEGER NOT NULL DEFAULT 180000,
    "preview_url" TEXT,
    "stream_url" TEXT,
    "spotify_url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'soundcloud',
    "position" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_playlist_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_playlist_tracks_playlist_id_track_id_key" ON "user_playlist_tracks"("playlist_id", "track_id");
CREATE INDEX IF NOT EXISTS "user_playlist_tracks_playlist_id_position_idx" ON "user_playlist_tracks"("playlist_id", "position" ASC);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_playlist_tracks_playlist_id_fkey') THEN
        ALTER TABLE "user_playlist_tracks" ADD CONSTRAINT "user_playlist_tracks_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "user_playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable feature_flags
CREATE TABLE IF NOT EXISTS "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_percentage" INTEGER NOT NULL DEFAULT 0,
    "target_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "variants" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_key_key" ON "feature_flags"("key");
CREATE INDEX IF NOT EXISTS "feature_flags_key_is_enabled_idx" ON "feature_flags"("key", "is_enabled");
