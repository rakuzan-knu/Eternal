-- Add database-side default for User.id so raw inserts and upserts without id generate a UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
