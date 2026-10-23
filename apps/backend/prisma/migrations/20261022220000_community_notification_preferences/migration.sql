CREATE TYPE "NotificationMode" AS ENUM ('ALL', 'MENTIONS', 'NONE');
ALTER TABLE "community_members" ADD COLUMN "notificationMode" "NotificationMode" NOT NULL DEFAULT 'ALL', ADD COLUMN "notificationMutedUntil" TIMESTAMP(3);
ALTER TABLE "ConversationParticipant" ADD COLUMN "notificationMode" "NotificationMode";
ALTER TABLE "Message" ADD COLUMN "mentionedUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
