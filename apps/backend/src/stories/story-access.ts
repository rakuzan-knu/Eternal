import type { PrismaService } from '@common/prisma';
import { StoryPrivacy } from '@prisma/client';

type StoryAccessInput = { authorId: string; privacy: StoryPrivacy; expiresAt: Date | string };
/** Batch fresh audience checks so cached content cannot outlive a privacy change. */
export async function storyAccess(
  prisma: PrismaService,
  stories: StoryAccessInput[],
  viewerId?: string,
): Promise<boolean[]> {
  const ownerIds = [...new Set(stories.map((s) => s.authorId).filter((id) => id !== viewerId))];
  if (!ownerIds.length) return stories.map((s) => new Date(s.expiresAt).getTime() > Date.now());
  const [owners, blocks, follows, closeFriends] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, isPrivate: true },
    }),
    viewerId
      ? prisma.userBlock.findMany({
          where: {
            OR: [
              { blockerId: { in: ownerIds }, blockedId: viewerId },
              { blockerId: viewerId, blockedId: { in: ownerIds } },
            ],
          },
          select: { blockerId: true, blockedId: true },
        })
      : Promise.resolve([]),
    viewerId
      ? prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: ownerIds }, status: 'ACCEPTED' },
          select: { followingId: true },
        })
      : Promise.resolve([]),
    viewerId
      ? prisma.closeFriend.findMany({
          where: { userId: { in: ownerIds }, friendId: viewerId },
          select: { userId: true },
        })
      : Promise.resolve([]),
  ]);
  const ownerMap = new Map(owners.map((o) => [o.id, o]));
  const blocked = new Set(
    blocks.map((b) => (b.blockerId === viewerId ? b.blockedId : b.blockerId)),
  );
  const following = new Set(follows.map((f) => f.followingId));
  const close = new Set(closeFriends.map((f) => f.userId));
  return stories.map((story) => {
    if (new Date(story.expiresAt).getTime() <= Date.now()) return false;
    if (story.authorId === viewerId) return true;
    const owner = ownerMap.get(story.authorId);
    return Boolean(
      owner &&
      !blocked.has(story.authorId) &&
      (!owner.isPrivate || following.has(story.authorId)) &&
      (story.privacy === StoryPrivacy.ALL_FOLLOWERS || close.has(story.authorId)),
    );
  });
}
export async function canViewStory(
  prisma: PrismaService,
  story: StoryAccessInput,
  viewerId?: string,
): Promise<boolean> {
  return (await storyAccess(prisma, [story], viewerId))[0];
}
