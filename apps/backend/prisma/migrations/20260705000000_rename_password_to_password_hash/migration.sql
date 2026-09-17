-- ALLOW_CONTRACT_PHASE
-- Rename "password" column to "passwordHash" to reflect that it stores
-- an argon2 hash, not the plaintext password.
ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";
