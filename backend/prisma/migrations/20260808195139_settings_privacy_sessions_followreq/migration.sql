-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('EVERYBODY', 'CONTACTS', 'NOBODY');

-- CreateEnum
CREATE TYPE "PrivacyDimension" AS ENUM ('LAST_SEEN', 'AVATAR', 'BANNER', 'FORWARD_LINK', 'CALLS', 'VOICE_MESSAGES', 'MESSAGES', 'BIRTHDAY', 'BIO', 'GROUP_INVITES');

-- CreateEnum
CREATE TYPE "ExceptionMode" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "AutoDeletePeriod" AS ENUM ('OFF', 'DAY', 'WEEK', 'MONTH', 'QUARTER');

-- AlterTable
ALTER TABLE "Follow" ADD COLUMN     "status" "FollowStatus" NOT NULL DEFAULT 'ACCEPTED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoDeletePeriod" "AutoDeletePeriod" NOT NULL DEFAULT 'OFF',
ADD COLUMN     "banner" TEXT,
ADD COLUMN     "bannerPosition" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserPrivacy" (
    "userId" TEXT NOT NULL,
    "lastSeen" "Visibility" NOT NULL DEFAULT 'EVERYBODY',
    "avatar" "Visibility" NOT NULL DEFAULT 'EVERYBODY',
    "banner" "Visibility" NOT NULL DEFAULT 'EVERYBODY',
    "forwardLink" "Visibility" NOT NULL DEFAULT 'EVERYBODY',
    "calls" "Visibility" NOT NULL DEFAULT 'EVERYBODY',
    "voiceMessages" "Visibility" NOT NULL DEFAULT 'EVERYBODY',
    "messages" "Visibility" NOT NULL DEFAULT 'EVERYBODY',
    "birthday" "Visibility" NOT NULL DEFAULT 'NOBODY',
    "bio" "Visibility" NOT NULL DEFAULT 'EVERYBODY',
    "groupInvites" "Visibility" NOT NULL DEFAULT 'EVERYBODY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPrivacy_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PrivacyException" (
    "ownerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "dimension" "PrivacyDimension" NOT NULL,
    "mode" "ExceptionMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyException_pkey" PRIMARY KEY ("ownerId","dimension","targetId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "deviceName" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivacyException_ownerId_dimension_idx" ON "PrivacyException"("ownerId", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "Session_jti_key" ON "Session"("jti");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Follow_followingId_status_idx" ON "Follow"("followingId", "status");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- AddForeignKey
ALTER TABLE "UserPrivacy" ADD CONSTRAINT "UserPrivacy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyException" ADD CONSTRAINT "PrivacyException_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyException" ADD CONSTRAINT "PrivacyException_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
