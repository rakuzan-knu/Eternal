-- AlterTable
ALTER TABLE "User" ADD COLUMN "flags" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN "permissions" INTEGER NOT NULL DEFAULT 0;
