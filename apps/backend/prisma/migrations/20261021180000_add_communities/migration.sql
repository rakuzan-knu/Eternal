-- Additive rollout: verified backup, then apply on core before messenger/web releases.
-- No existing group is converted. Retain new tables on rollback; old code ignores them.
CREATE TYPE "CommunityMemberState" AS ENUM ('ACTIVE', 'LEFT', 'BANNED');
CREATE TABLE "communities" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "avatar" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_members" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER',
  "state" "CommunityMemberState" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "community_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_members_role_check" CHECK ("role" <> 'OWNER')
);
CREATE TABLE "community_channels" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_channels_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_invites" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "maxUses" INTEGER,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_invites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_invites_uses_check" CHECK ("useCount" >= 0 AND ("maxUses" IS NULL OR ("maxUses" >= 1 AND "useCount" <= "maxUses")))
);
CREATE INDEX "communities_createdAt_id_idx" ON "communities"("createdAt", "id");
CREATE INDEX "communities_ownerId_idx" ON "communities"("ownerId");
CREATE UNIQUE INDEX "community_members_communityId_userId_key" ON "community_members"("communityId", "userId");
CREATE INDEX "community_members_userId_state_communityId_idx" ON "community_members"("userId", "state", "communityId");
CREATE INDEX "community_members_communityId_state_id_idx" ON "community_members"("communityId", "state", "id");
CREATE UNIQUE INDEX "community_channels_conversationId_key" ON "community_channels"("conversationId");
CREATE INDEX "community_channels_communityId_position_id_idx" ON "community_channels"("communityId", "position", "id");
CREATE UNIQUE INDEX "community_invites_tokenHash_key" ON "community_invites"("tokenHash");
CREATE INDEX "community_invites_communityId_createdAt_id_idx" ON "community_invites"("communityId", "createdAt", "id");
ALTER TABLE "communities" ADD CONSTRAINT "communities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_channels" ADD CONSTRAINT "community_channels_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_channels" ADD CONSTRAINT "community_channels_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_invites" ADD CONSTRAINT "community_invites_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_invites" ADD CONSTRAINT "community_invites_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
