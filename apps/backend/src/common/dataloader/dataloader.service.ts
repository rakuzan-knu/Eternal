import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '@common/prisma';
import type { UserSnapshot } from '@common/contracts';

export interface PostStats {
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
}

export interface CommentStats {
  likesCount: number;
  repliesCount: number;
}

export interface MessageSnapshot {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  messageType: string;
  replyToId: string | null;
  forwardedFromId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  deletedForAll: boolean;
  editedAt: Date | null;
}

export interface PostInteraction {
  isLiked: boolean;
  isSaved: boolean;
  isReposted: boolean;
}

export interface ScopedLoaders {
  userLoader: DataLoader<string, UserSnapshot | null>;
  avatarLoader: DataLoader<string, string | null>;
  messageReactionsLoader: DataLoader<string, unknown[]>;
  unreadCountLoader: DataLoader<
    {
      conversationId: string;
      userId: string;
      joinedAt: Date;
      lastReadAt: Date;
      hiddenUserIds?: string[];
    },
    number,
    string
  >;
  postStatsLoader: DataLoader<string, PostStats>;
  commentStatsLoader: DataLoader<string, CommentStats>;
  messageLoader: DataLoader<string, MessageSnapshot | null>;
  userBadgesLoader: DataLoader<string, string[]>;
  userFollowsLoader: DataLoader<{ followerId: string; followingId: string }, boolean, string>;
  postInteractionsLoader: DataLoader<{ postId: string; userId: string }, PostInteraction, string>;
}

@Injectable()
export class DataLoaderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a batch loader for User snapshots by user IDs.
   */
  createUserLoader(): DataLoader<string, UserSnapshot | null> {
    return new DataLoader<string, UserSnapshot | null>(async (userIds: readonly string[]) => {
      const ids = Array.from(new Set(userIds));
      const users = await this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          isVerified: true,
          primaryBadge: true,
          defaultChatTheme: true,
        },
      });

      const userMap = new Map<string, UserSnapshot>();
      for (const u of users) {
        userMap.set(u.id, u);
      }

      return userIds.map((id) => userMap.get(id) ?? null);
    });
  }

  /**
   * Creates a batch loader for user avatars.
   */
  createAvatarLoader(): DataLoader<string, string | null> {
    return new DataLoader<string, string | null>(async (userIds: readonly string[]) => {
      const ids = Array.from(new Set(userIds));
      const users = await this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, avatar: true },
      });

      const avatarMap = new Map<string, string | null>();
      for (const u of users) {
        avatarMap.set(u.id, u.avatar ?? null);
      }

      return userIds.map((id) => avatarMap.get(id) ?? null);
    });
  }

  /**
   * Creates a batch loader for message reactions grouped by message ID.
   */
  createMessageReactionsLoader(): DataLoader<string, unknown[]> {
    return new DataLoader<string, unknown[]>(async (messageIds: readonly string[]) => {
      const ids = Array.from(new Set(messageIds));
      const reactions = await this.prisma.messageReaction.findMany({
        where: { messageId: { in: ids } },
        select: {
          id: true,
          emoji: true,
          userId: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              defaultChatTheme: true,
            },
          },
          messageId: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      const reactionsMap = new Map<string, typeof reactions>();
      for (const r of reactions) {
        const existing = reactionsMap.get(r.messageId) || [];
        existing.push(r);
        reactionsMap.set(r.messageId, existing);
      }

      return messageIds.map((id) => reactionsMap.get(id) || []);
    });
  }

  /**
   * Creates a batch loader for conversation unread message counts.
   */
  createUnreadCountLoader(): DataLoader<
    {
      conversationId: string;
      userId: string;
      joinedAt: Date;
      lastReadAt: Date;
      hiddenUserIds?: string[];
    },
    number
  > {
    return new DataLoader(
      async (
        keys: readonly {
          conversationId: string;
          userId: string;
          joinedAt: Date;
          lastReadAt: Date;
          hiddenUserIds?: string[];
        }[],
      ) => {
        // Execute batch counts efficiently
        const counts = await Promise.all(
          keys.map((key) =>
            this.prisma.message.count({
              where: {
                conversationId: key.conversationId,
                senderId: { notIn: [key.userId, ...(key.hiddenUserIds || [])] },
                deletedAt: null,
                deletedForAll: false,
                createdAt: {
                  gte: key.joinedAt,
                  gt: key.lastReadAt,
                },
                deletedFor: { none: { userId: key.userId } },
              },
            }),
          ),
        );
        return counts;
      },
      {
        cacheKeyFn: (key) =>
          `${key.conversationId}:${key.userId}:${key.lastReadAt.getTime()}:${(key.hiddenUserIds || []).join(',')}`,
      },
    );
  }

  /**
   * Creates a batch loader for post stats (likes, comments, reposts counts).
   */
  createPostStatsLoader(): DataLoader<string, PostStats> {
    return new DataLoader<string, PostStats>(async (postIds: readonly string[]) => {
      const ids = Array.from(new Set(postIds));
      const [likes, comments, reposts] = await Promise.all([
        this.prisma.like.groupBy({
          by: ['postId'],
          where: { postId: { in: ids } },
          _count: { _all: true },
        }),
        this.prisma.comment.groupBy({
          by: ['postId'],
          where: { postId: { in: ids }, isDeleted: false },
          _count: { _all: true },
        }),
        this.prisma.repost.groupBy({
          by: ['postId'],
          where: { postId: { in: ids } },
          _count: { _all: true },
        }),
      ]);

      const likesMap = new Map(likes.map((l) => [l.postId, l._count._all]));
      const commentsMap = new Map(comments.map((c) => [c.postId, c._count._all]));
      const repostsMap = new Map(reposts.map((r) => [r.postId, r._count._all]));

      return postIds.map((id) => ({
        likesCount: likesMap.get(id) ?? 0,
        commentsCount: commentsMap.get(id) ?? 0,
        repostsCount: repostsMap.get(id) ?? 0,
      }));
    });
  }

  /**
   * Creates a batch loader for comment stats (likes and replies counts).
   */
  createCommentStatsLoader(): DataLoader<string, CommentStats> {
    return new DataLoader<string, CommentStats>(async (commentIds: readonly string[]) => {
      const ids = Array.from(new Set(commentIds));
      const [likes, replies] = await Promise.all([
        this.prisma.commentLike.groupBy({
          by: ['commentId'],
          where: { commentId: { in: ids } },
          _count: { _all: true },
        }),
        this.prisma.comment.groupBy({
          by: ['parentId'],
          where: { parentId: { in: ids }, isDeleted: false },
          _count: { _all: true },
        }),
      ]);

      const likesMap = new Map(likes.map((l) => [l.commentId, l._count._all]));
      const repliesMap = new Map(replies.map((r) => [r.parentId as string, r._count._all]));

      return commentIds.map((id) => ({
        likesCount: likesMap.get(id) ?? 0,
        repliesCount: repliesMap.get(id) ?? 0,
      }));
    });
  }

  /**
   * Creates a batch loader for Messages by message IDs.
   */
  createMessageLoader(): DataLoader<string, MessageSnapshot | null> {
    return new DataLoader<string, MessageSnapshot | null>(async (messageIds: readonly string[]) => {
      const ids = Array.from(new Set(messageIds));
      const messages = await this.prisma.message.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          body: true,
          messageType: true,
          replyToId: true,
          forwardedFromId: true,
          createdAt: true,
          deletedAt: true,
          deletedForAll: true,
          editedAt: true,
        },
      });

      const messageMap = new Map<string, (typeof messages)[0]>();
      for (const m of messages) {
        messageMap.set(m.id, m);
      }

      return messageIds.map((id) => messageMap.get(id) ?? null);
    });
  }

  /**
   * Creates a batch loader for User badges by user IDs.
   */
  createUserBadgesLoader(): DataLoader<string, string[]> {
    return new DataLoader<string, string[]>(async (userIds: readonly string[]) => {
      const ids = Array.from(new Set(userIds));
      const badges = await this.prisma.userBadge.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, badgeId: true },
      });

      const badgesMap = new Map<string, string[]>();
      for (const b of badges) {
        const list = badgesMap.get(b.userId) || [];
        list.push(b.badgeId);
        badgesMap.set(b.userId, list);
      }

      return userIds.map((id) => badgesMap.get(id) || []);
    });
  }

  /**
   * Creates a batch loader to check whether a follower follows target users.
   */
  createUserFollowsLoader(): DataLoader<
    { followerId: string; followingId: string },
    boolean,
    string
  > {
    return new DataLoader<{ followerId: string; followingId: string }, boolean, string>(
      async (keys: readonly { followerId: string; followingId: string }[]) => {
        const followerIds = Array.from(new Set(keys.map((k) => k.followerId)));
        const followingIds = Array.from(new Set(keys.map((k) => k.followingId)));

        const follows = await this.prisma.follow.findMany({
          where: {
            followerId: { in: followerIds },
            followingId: { in: followingIds },
            status: 'ACCEPTED',
          },
          select: { followerId: true, followingId: true },
        });

        const followSet = new Set(follows.map((f) => `${f.followerId}:${f.followingId}`));
        return keys.map((k) => followSet.has(`${k.followerId}:${k.followingId}`));
      },
      {
        cacheKeyFn: (k) => `${k.followerId}:${k.followingId}`,
      },
    );
  }

  /**
   * Creates a batch loader to retrieve user interaction state (liked, saved, reposted) across posts.
   */
  createPostInteractionsLoader(): DataLoader<
    { postId: string; userId: string },
    PostInteraction,
    string
  > {
    return new DataLoader<{ postId: string; userId: string }, PostInteraction, string>(
      async (keys: readonly { postId: string; userId: string }[]) => {
        const userIds = Array.from(new Set(keys.map((k) => k.userId)));
        const postIds = Array.from(new Set(keys.map((k) => k.postId)));

        const [likes, savedPosts, reposts] = await Promise.all([
          this.prisma.like.findMany({
            where: {
              userId: { in: userIds },
              postId: { in: postIds },
            },
            select: { userId: true, postId: true },
          }),
          this.prisma.savedPost.findMany({
            where: {
              userId: { in: userIds },
              postId: { in: postIds },
            },
            select: { userId: true, postId: true },
          }),
          this.prisma.repost.findMany({
            where: {
              userId: { in: userIds },
              postId: { in: postIds },
            },
            select: { userId: true, postId: true },
          }),
        ]);

        const likeSet = new Set(likes.map((l) => `${l.userId}:${l.postId}`));
        const savedSet = new Set(savedPosts.map((s) => `${s.userId}:${s.postId}`));
        const repostSet = new Set(reposts.map((r) => `${r.userId}:${r.postId}`));

        return keys.map((k) => ({
          isLiked: likeSet.has(`${k.userId}:${k.postId}`),
          isSaved: savedSet.has(`${k.userId}:${k.postId}`),
          isReposted: repostSet.has(`${k.userId}:${k.postId}`),
        }));
      },
      {
        cacheKeyFn: (k) => `${k.userId}:${k.postId}`,
      },
    );
  }

  /**
   * Returns a complete bundle of fresh request-scoped DataLoader instances.
   */
  createScopedLoaders(): ScopedLoaders {
    return {
      userLoader: this.createUserLoader(),
      avatarLoader: this.createAvatarLoader(),
      messageReactionsLoader: this.createMessageReactionsLoader(),
      unreadCountLoader: this.createUnreadCountLoader(),
      postStatsLoader: this.createPostStatsLoader(),
      commentStatsLoader: this.createCommentStatsLoader(),
      messageLoader: this.createMessageLoader(),
      userBadgesLoader: this.createUserBadgesLoader(),
      userFollowsLoader: this.createUserFollowsLoader(),
      postInteractionsLoader: this.createPostInteractionsLoader(),
    };
  }
}
