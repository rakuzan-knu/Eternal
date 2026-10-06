-- CreateEnum
CREATE TYPE "DecorationAssetType" AS ENUM ('animated_webp', 'css_canvas', 'lottie');

-- CreateEnum
CREATE TYPE "DecorationRarity" AS ENUM ('common', 'rare', 'epic', 'legendary');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active_decoration_id" TEXT;

-- CreateTable
CREATE TABLE "avatar_decorations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "asset_type" "DecorationAssetType" NOT NULL,
    "asset_url" TEXT NOT NULL,
    "preview_url" TEXT NOT NULL,
    "rarity" "DecorationRarity" NOT NULL DEFAULT 'common',
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "avatar_decorations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_decorations" (
    "user_id" TEXT NOT NULL,
    "decoration_id" TEXT NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_decorations_pkey" PRIMARY KEY ("user_id","decoration_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "avatar_decorations_slug_key" ON "avatar_decorations"("slug");

-- CreateIndex
CREATE INDEX "user_decorations_decoration_id_idx" ON "user_decorations"("decoration_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_active_decoration_id_fkey" FOREIGN KEY ("active_decoration_id") REFERENCES "avatar_decorations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_decorations" ADD CONSTRAINT "user_decorations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_decorations" ADD CONSTRAINT "user_decorations_decoration_id_fkey" FOREIGN KEY ("decoration_id") REFERENCES "avatar_decorations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "avatar_decorations" ADD CONSTRAINT "avatar_decorations_nonnegative_price" CHECK ("price_cents" >= 0);
CREATE INDEX "User_active_decoration_id_idx" ON "User"("active_decoration_id");
-- Ownership is also enforced below the API, including inventory revocations.
ALTER TABLE "User" ADD CONSTRAINT "User_active_decoration_owned_fkey"
  FOREIGN KEY ("id", "active_decoration_id") REFERENCES "user_decorations"("user_id", "decoration_id")
  DEFERRABLE INITIALLY DEFERRED;

INSERT INTO "avatar_decorations" ("id", "name", "slug", "description", "asset_type", "asset_url", "preview_url", "rarity", "price_cents") VALUES
('cyber-neon-pulse', 'Cyber Neon Pulse', 'cyber-neon-pulse', 'Хром, электрический свет и орбитальный импульс.', 'css_canvas', '', '/Profile-decorations/Avatar-decorations/cyber-neon-pulse.preview.webp', 'rare', 0),
('astral-sigil', 'Astral Sigil', 'astral-sigil', 'Серебряная печать с кристаллами и мерцающими звёздами.', 'animated_webp', '/Profile-decorations/Avatar-decorations/astral-sigil.webp', '/Profile-decorations/Avatar-decorations/astral-sigil.preview.webp', 'legendary', 599),
('obsidian-crown', 'Obsidian Crown', 'obsidian-crown', 'Готическая корона из тёмного металла и аметиста.', 'animated_webp', '/Profile-decorations/Avatar-decorations/obsidian-crown.webp', '/Profile-decorations/Avatar-decorations/obsidian-crown.preview.webp', 'epic', 599),
('ronin-orbit', 'Ronin Orbit', 'ronin-orbit', 'Кольцо серебряных символов с алым орбитальным светом.', 'animated_webp', '/Profile-decorations/Avatar-decorations/ronin-orbit.webp', '/Profile-decorations/Avatar-decorations/ronin-orbit.preview.webp', 'epic', 499);
