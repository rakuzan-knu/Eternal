-- Nullable additions keep existing stories and older clients compatible.
ALTER TABLE "stories"
  ADD COLUMN "background_color" VARCHAR(512),
  ADD COLUMN "filter" VARCHAR(64),
  ADD COLUMN "media_assets" JSONB;
