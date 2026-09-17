-- CreateEnum
CREATE TYPE "ShowcasePrivacy" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ShowcaseMediaType" AS ENUM ('ANIME', 'GAME', 'MOVIE', 'SERIES');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "gender" TEXT;

-- CreateTable
CREATE TABLE "profile_showcases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "privacy_meta" "ShowcasePrivacy" NOT NULL DEFAULT 'PUBLIC',
    "privacy_activity" "ShowcasePrivacy" NOT NULL DEFAULT 'PUBLIC',
    "privacy_showcase" "ShowcasePrivacy" NOT NULL DEFAULT 'PUBLIC',
    "privacy_links" "ShowcasePrivacy" NOT NULL DEFAULT 'PUBLIC',
    "show_age" BOOLEAN NOT NULL DEFAULT false,
    "show_birthdate" BOOLEAN NOT NULL DEFAULT true,
    "show_gender" BOOLEAN NOT NULL DEFAULT true,
    "show_timezone" BOOLEAN NOT NULL DEFAULT true,
    "pronouns" VARCHAR(20),
    "timezone" TEXT DEFAULT 'UTC',
    "accent_color" TEXT DEFAULT '#6366f1',
    "connected_accounts" JSONB,
    "activity_status" JSONB,
    "spotlight_media" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_showcases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_media" (
    "id" TEXT NOT NULL,
    "showcase_id" TEXT NOT NULL,
    "type" "ShowcaseMediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "poster_url" TEXT NOT NULL,
    "external_id" TEXT,
    "external_url" TEXT,
    "rating" DOUBLE PRECISION,
    "user_comment" VARCHAR(120),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "release_year" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showcase_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_showcases_user_id_key" ON "profile_showcases"("user_id");

-- CreateIndex
CREATE INDEX "showcase_media_showcase_id_type_idx" ON "showcase_media"("showcase_id", "type");

-- CreateIndex
CREATE INDEX "showcase_media_external_id_idx" ON "showcase_media"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "showcase_media_showcase_id_type_position_key" ON "showcase_media"("showcase_id", "type", "position");

-- AddForeignKey
ALTER TABLE "profile_showcases" ADD CONSTRAINT "profile_showcases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_media" ADD CONSTRAINT "showcase_media_showcase_id_fkey" FOREIGN KEY ("showcase_id") REFERENCES "profile_showcases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
