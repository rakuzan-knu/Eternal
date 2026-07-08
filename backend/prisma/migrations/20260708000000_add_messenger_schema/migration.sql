CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

CREATE TYPE "ParticipantRole" AS ENUM ('MEMBER', 'ADMIN', 'OWNER');

CREATE TYPE "MuteLevel" AS ENUM (
  'NONE',
  'MESSAGES',
  'CALLS',
  'MESSAGES_AND_CALLS'
);

CREATE TYPE "MessageType" AS ENUM (
  'TEXT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'FILE',
  'GIF',
  'STICKER',
  'LOCATION',
  'CALL_LOG',
  'SYSTEM',
  'DELETED'
);

CREATE TYPE "AttachmentType" AS ENUM (
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'FILE',
  'LINK',
  'GIF'
);

CREATE TYPE "ReportCategory" AS ENUM (
  'SPAM',
  'SUICIDE_SELF_HARM',
  'IMPERSONATION',
  'VIOLENCE_DANGEROUS_ORGS',
  'NUDITY_SEXUAL',
  'RESTRICTED_GOODS',
  'FRAUD',
  'OTHER'
);

CREATE TYPE "ReportStatus" AS ENUM (
  'PENDING',
  'REVIEWED',
  'DISMISSED',
  'ACTION_TAKEN'
);

CREATE TABLE "Conversation" (
    "id"          TEXT                NOT NULL,
    "type"        "ConversationType"  NOT NULL DEFAULT 'DIRECT',
    "name"        TEXT,
    "avatar"      TEXT,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)        NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Conversation_createdAt_idx" ON "Conversation"("createdAt");

CREATE TABLE "ConversationParticipant" (
    "id"             TEXT                NOT NULL,
    "conversationId" TEXT                NOT NULL,
    "userId"         TEXT                NOT NULL,
    "nickname"       TEXT,
    "role"           "ParticipantRole"   NOT NULL DEFAULT 'MEMBER',
    "theme"          TEXT                DEFAULT 'default',
    "muteLevel"      "MuteLevel"         NOT NULL DEFAULT 'NONE',
    "mutedUntil"     TIMESTAMP(3),
    "leftAt"         TIMESTAMP(3),
    "archivedAt"     TIMESTAMP(3),
    "joinedAt"       TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)        NOT NULL,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key"
    ON "ConversationParticipant"("conversationId", "userId");

CREATE INDEX "ConversationParticipant_userId_idx"
    ON "ConversationParticipant"("userId");

CREATE INDEX "ConversationParticipant_conversationId_idx"
    ON "ConversationParticipant"("conversationId");

CREATE TABLE "Message" (
    "id"              TEXT           NOT NULL,
    "conversationId"  TEXT           NOT NULL,
    "senderId"        TEXT           NOT NULL,
    "body"            TEXT,
    "messageType"     "MessageType"  NOT NULL DEFAULT 'TEXT',
    "replyToId"       TEXT,
    "forwardedFromId" TEXT,
    "deletedAt"       TIMESTAMP(3),
    "deletedForAll"   BOOLEAN        NOT NULL DEFAULT false,
    "editedAt"        TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_conversationId_createdAt_idx"
    ON "Message"("conversationId", "createdAt");

CREATE INDEX "Message_senderId_idx"
    ON "Message"("senderId");

CREATE TABLE "MessageAttachment" (
    "id"           TEXT             NOT NULL,
    "messageId"    TEXT             NOT NULL,
    "type"         "AttachmentType" NOT NULL,
    "url"          TEXT             NOT NULL,
    "fileName"     TEXT,
    "mimeType"     TEXT,
    "size"         INTEGER,
    "width"        INTEGER,
    "height"       INTEGER,
    "duration"     INTEGER,
    "thumbnailUrl" TEXT,
    "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageAttachment_messageId_idx"
    ON "MessageAttachment"("messageId");

CREATE TABLE "MessageReaction" (
    "id"        TEXT         NOT NULL,
    "messageId" TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "emoji"     TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key"
    ON "MessageReaction"("messageId", "userId", "emoji");

CREATE INDEX "MessageReaction_messageId_idx"
    ON "MessageReaction"("messageId");

CREATE TABLE "MessageReadReceipt" (
    "id"        TEXT         NOT NULL,
    "messageId" TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "readAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReadReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageReadReceipt_messageId_userId_key"
    ON "MessageReadReceipt"("messageId", "userId");

CREATE INDEX "MessageReadReceipt_userId_idx"
    ON "MessageReadReceipt"("userId");

CREATE TABLE "PinnedMessage" (
    "id"             TEXT         NOT NULL,
    "conversationId" TEXT         NOT NULL,
    "messageId"      TEXT         NOT NULL,
    "pinnedByUserId" TEXT         NOT NULL,
    "pinnedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinnedMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PinnedMessage_conversationId_messageId_key"
    ON "PinnedMessage"("conversationId", "messageId");

CREATE INDEX "PinnedMessage_conversationId_idx"
    ON "PinnedMessage"("conversationId");

CREATE TABLE "MessageDeletion" (
    "messageId" TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageDeletion_pkey" PRIMARY KEY ("messageId", "userId")
);

CREATE TABLE "UserBlock" (
    "blockerId" TEXT         NOT NULL,
    "blockedId" TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("blockerId", "blockedId")
);

CREATE TABLE "Report" (
    "id"         TEXT             NOT NULL,
    "reporterId" TEXT             NOT NULL,
    "reportedId" TEXT             NOT NULL,
    "messageId"  TEXT,
    "category"   "ReportCategory" NOT NULL,
    "details"    TEXT,
    "status"     "ReportStatus"   NOT NULL DEFAULT 'PENDING',
    "createdAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_reportedId_idx" ON "Report"("reportedId");
CREATE INDEX "Report_status_idx"     ON "Report"("status");

ALTER TABLE "ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_replyToId_fkey"
    FOREIGN KEY ("replyToId") REFERENCES "Message"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_forwardedFromId_fkey"
    FOREIGN KEY ("forwardedFromId") REFERENCES "Message"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MessageAttachment"
    ADD CONSTRAINT "MessageAttachment_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageReaction"
    ADD CONSTRAINT "MessageReaction_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageReaction"
    ADD CONSTRAINT "MessageReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageReadReceipt"
    ADD CONSTRAINT "MessageReadReceipt_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageReadReceipt"
    ADD CONSTRAINT "MessageReadReceipt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PinnedMessage"
    ADD CONSTRAINT "PinnedMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PinnedMessage"
    ADD CONSTRAINT "PinnedMessage_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageDeletion"
    ADD CONSTRAINT "MessageDeletion_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageDeletion"
    ADD CONSTRAINT "MessageDeletion_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserBlock"
    ADD CONSTRAINT "UserBlock_blockerId_fkey"
    FOREIGN KEY ("blockerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserBlock"
    ADD CONSTRAINT "UserBlock_blockedId_fkey"
    FOREIGN KEY ("blockedId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
    ADD CONSTRAINT "Report_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
    ADD CONSTRAINT "Report_reportedId_fkey"
    FOREIGN KEY ("reportedId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
