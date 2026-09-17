-- AlterTable
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "rootParentId" TEXT;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "replyToUserId" TEXT;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CommentLike_commentId_userId_key" ON "CommentLike"("commentId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CommentLike_userId_idx" ON "CommentLike"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CommentLike_commentId_idx" ON "CommentLike"("commentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_postId_parentId_createdAt_idx" ON "Comment"("postId", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_postId_rootParentId_createdAt_idx" ON "Comment"("postId", "rootParentId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_parentId_createdAt_idx" ON "Comment"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_rootParentId_createdAt_idx" ON "Comment"("rootParentId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Comment_replyToUserId_fkey'
    ) THEN
        ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replyToUserId_fkey" FOREIGN KEY ("replyToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CommentLike_commentId_fkey'
    ) THEN
        ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CommentLike_userId_fkey'
    ) THEN
        ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
