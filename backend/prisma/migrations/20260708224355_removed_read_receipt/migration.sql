/*
  Warnings:

  - You are about to drop the `MessageReadReceipt` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MessageReadReceipt" DROP CONSTRAINT "MessageReadReceipt_messageId_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadReceipt" DROP CONSTRAINT "MessageReadReceipt_userId_fkey";

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "MessageReadReceipt";
