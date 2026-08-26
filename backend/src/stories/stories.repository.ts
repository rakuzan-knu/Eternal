import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import {
  Story,
  StoryMediaType,
  StoryPrivacy,
  StoryView,
  StoryReaction,
  StoryPollVote,
} from '@prisma/client';

export interface CreateStoryDbData {
  authorId: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  caption?: string | null;
  overlays?: unknown;
  privacy: StoryPrivacy;
  expiresAt: Date;
}

@Injectable()
export class StoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createStory(data: CreateStoryDbData): Promise<Story> {
    return this.prisma.story.create({
      data: {
        authorId: data.authorId,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        caption: data.caption,
        overlays: data.overlays as any,
        privacy: data.privacy,
        expiresAt: data.expiresAt,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
          },
        },
        views: true,
        reactions: true,
        pollVotes: true,
      },
    });
  }

  async findActiveFeedStories(
    viewerId: string,
    followedUserIds: string[],
    closeFriendAuthorIds: string[],
  ) {
    const now = new Date();
    const allAuthorIds = Array.from(new Set([viewerId, ...followedUserIds]));

    return this.prisma.story.findMany({
      where: {
        authorId: { in: allAuthorIds },
        expiresAt: { gt: now },
        OR: [
          // 1. All public/follower stories
          { privacy: StoryPrivacy.ALL_FOLLOWERS },
          // 2. Own stories
          { authorId: viewerId },
          // 3. Close friend stories where viewer is in close friends list
          {
            privacy: StoryPrivacy.CLOSE_FRIENDS,
            authorId: { in: closeFriendAuthorIds },
          },
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
          },
        },
        views: {
          select: {
            viewerId: true,
            viewedAt: true,
          },
        },
        reactions: {
          select: {
            userId: true,
            emoji: true,
          },
        },
        pollVotes: {
          select: {
            userId: true,
            optionIndex: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findActiveUserStories(userId: string, viewerId?: string, isCloseFriend = false) {
    const now = new Date();
    const isOwner = viewerId === userId;

    return this.prisma.story.findMany({
      where: {
        authorId: userId,
        expiresAt: { gt: now },
        ...(isOwner ? {} : isCloseFriend ? {} : { privacy: StoryPrivacy.ALL_FOLLOWERS }),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
          },
        },
        views: {
          select: {
            viewerId: true,
            viewedAt: true,
          },
        },
        reactions: {
          select: {
            userId: true,
            emoji: true,
          },
        },
        pollVotes: {
          select: {
            userId: true,
            optionIndex: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(storyId: string) {
    return this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
          },
        },
        views: true,
        reactions: true,
        pollVotes: true,
      },
    });
  }

  async recordView(storyId: string, viewerId: string): Promise<StoryView> {
    return this.prisma.storyView.upsert({
      where: {
        storyId_viewerId: { storyId, viewerId },
      },
      update: {
        viewedAt: new Date(),
      },
      create: {
        storyId,
        viewerId,
      },
    });
  }

  async recordReaction(storyId: string, userId: string, emoji: string): Promise<StoryReaction> {
    const existing = await this.prisma.storyReaction.findFirst({
      where: { storyId, userId },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        // Toggle off if clicking the same emoji
        await this.prisma.storyReaction.delete({
          where: { id: existing.id },
        });
        return existing;
      }
      return this.prisma.storyReaction.update({
        where: { id: existing.id },
        data: { emoji, createdAt: new Date() },
      });
    }

    return this.prisma.storyReaction.create({
      data: {
        storyId,
        userId,
        emoji,
      },
    });
  }

  async recordPollVote(
    storyId: string,
    userId: string,
    optionIndex: number,
  ): Promise<StoryPollVote> {
    return this.prisma.storyPollVote.upsert({
      where: {
        storyId_userId: { storyId, userId },
      },
      update: {
        optionIndex,
      },
      create: {
        storyId,
        userId,
        optionIndex,
      },
    });
  }

  async getStoryViewers(storyId: string) {
    const [views, reactions, votes] = await Promise.all([
      this.prisma.storyView.findMany({
        where: { storyId },
        include: {
          viewer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
        orderBy: { viewedAt: 'desc' },
      }),
      this.prisma.storyReaction.findMany({
        where: { storyId },
      }),
      this.prisma.storyPollVote.findMany({
        where: { storyId },
      }),
    ]);

    const reactionsMap = new Map<string, string>();
    for (const r of reactions) {
      reactionsMap.set(r.userId, r.emoji);
    }

    const votesMap = new Map<string, number>();
    for (const v of votes) {
      votesMap.set(v.userId, v.optionIndex);
    }

    return {
      totalViews: views.length,
      viewers: views.map((v: any) => ({
        user: v.viewer,
        viewedAt: v.viewedAt instanceof Date ? v.viewedAt.toISOString() : String(v.viewedAt),
        reaction: reactionsMap.get(v.viewerId) ?? null,
        pollVoteOption: votesMap.has(v.viewerId) ? votesMap.get(v.viewerId)! : null,
      })),
    };
  }

  async deleteStory(storyId: string, authorId: string): Promise<boolean> {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, authorId },
    });
    if (!story) return false;

    await this.prisma.story.delete({
      where: { id: storyId },
    });
    return true;
  }

  async findExpiredStories() {
    const now = new Date();
    return this.prisma.story.findMany({
      where: {
        expiresAt: { lte: now },
      },
      select: {
        id: true,
        mediaUrl: true,
      },
    });
  }

  async deleteExpiredStories(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await this.prisma.story.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }

  async getCloseFriends(userId: string) {
    return this.prisma.closeFriend.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isCloseFriend(ownerId: string, friendId: string): Promise<boolean> {
    const record = await this.prisma.closeFriend.findUnique({
      where: {
        userId_friendId: { userId: ownerId, friendId },
      },
    });
    return Boolean(record);
  }

  async getAuthorsWhoAddedViewerAsCloseFriend(
    viewerId: string,
    authorIds: string[],
  ): Promise<string[]> {
    if (authorIds.length === 0) return [];
    const records = await this.prisma.closeFriend.findMany({
      where: {
        friendId: viewerId,
        userId: { in: authorIds },
      },
      select: { userId: true },
    });
    return records.map((r: any) => r.userId);
  }

  async toggleCloseFriend(userId: string, friendId: string): Promise<{ isCloseFriend: boolean }> {
    const existing = await this.prisma.closeFriend.findUnique({
      where: {
        userId_friendId: { userId, friendId },
      },
    });

    if (existing) {
      await this.prisma.closeFriend.delete({
        where: { id: existing.id },
      });
      return { isCloseFriend: false };
    }

    await this.prisma.closeFriend.create({
      data: {
        userId,
        friendId,
      },
    });
    return { isCloseFriend: true };
  }
}
