-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'THEME_PROPOSAL';
ALTER TYPE "MessageType" ADD VALUE 'STORY_REPLY';

-- AlterEnum
ALTER TYPE "PrivacyDimension" ADD VALUE 'THEME_PROPOSALS';

-- CreateEnum
CREATE TYPE "StoryMediaType" AS ENUM ('IMAGE', 'VIDEO', 'VOICE');

-- CreateEnum
CREATE TYPE "StoryPrivacy" AS ENUM ('ALL_FOLLOWERS', 'CLOSE_FRIENDS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "default_chat_theme" TEXT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "sharedTheme" TEXT,
ADD COLUMN "sharedThemeUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserPrivacy" ADD COLUMN "themeProposals" "Visibility" NOT NULL DEFAULT 'EVERYBODY';

-- AlterTable
ALTER TABLE "profile_showcases" ADD COLUMN "anthem_track" JSONB;

-- AlterTable
ALTER TABLE "showcase_media" ADD COLUMN "is_wishlist" BOOLEAN NOT NULL DEFAULT false;

-- DropIndex
DROP INDEX IF EXISTS "showcase_media_showcase_id_type_position_key";

-- DropIndex
DROP INDEX IF EXISTS "showcase_media_showcase_id_type_idx";

-- CreateIndex
CREATE INDEX "showcase_media_showcase_id_type_is_wishlist_idx" ON "showcase_media"("showcase_id", "type", "is_wishlist");

-- CreateIndex
CREATE UNIQUE INDEX "showcase_media_showcase_id_type_is_wishlist_position_key" ON "showcase_media"("showcase_id", "type", "is_wishlist", "position");

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "media_type" "StoryMediaType" NOT NULL DEFAULT 'IMAGE',
    "caption" TEXT,
    "overlays" JSONB,
    "privacy" "StoryPrivacy" NOT NULL DEFAULT 'ALL_FOLLOWERS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_views" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_reactions" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_poll_votes" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "option_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "close_friends" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "friend_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "close_friends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stories_author_id_expires_at_idx" ON "stories"("author_id", "expires_at");

-- CreateIndex
CREATE INDEX "stories_expires_at_idx" ON "stories"("expires_at");

-- CreateIndex
CREATE INDEX "stories_created_at_idx" ON "stories"("created_at");

-- CreateIndex
CREATE INDEX "story_views_story_id_idx" ON "story_views"("story_id");

-- CreateIndex
CREATE INDEX "story_views_viewer_id_idx" ON "story_views"("viewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_views_story_id_viewer_id_key" ON "story_views"("story_id", "viewer_id");

-- CreateIndex
CREATE INDEX "story_reactions_story_id_idx" ON "story_reactions"("story_id");

-- CreateIndex
CREATE INDEX "story_reactions_user_id_idx" ON "story_reactions"("user_id");

-- CreateIndex
CREATE INDEX "story_poll_votes_story_id_idx" ON "story_poll_votes"("story_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_poll_votes_story_id_user_id_key" ON "story_poll_votes"("story_id", "user_id");

-- CreateIndex
CREATE INDEX "close_friends_user_id_idx" ON "close_friends"("user_id");

-- CreateIndex
CREATE INDEX "close_friends_friend_id_idx" ON "close_friends"("friend_id");

-- CreateIndex
CREATE UNIQUE INDEX "close_friends_user_id_friend_id_key" ON "close_friends"("user_id", "friend_id");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_poll_votes" ADD CONSTRAINT "story_poll_votes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_poll_votes" ADD CONSTRAINT "story_poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "close_friends" ADD CONSTRAINT "close_friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "close_friends" ADD CONSTRAINT "close_friends_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
