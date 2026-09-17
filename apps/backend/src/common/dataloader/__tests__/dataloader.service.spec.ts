import { DataLoaderService } from '../dataloader.service';
import type { PrismaService } from '@common/prisma';

describe('DataLoaderService', () => {
  let service: DataLoaderService;
  let mockPrisma: {
    user: { findMany: jest.Mock };
    messageReaction: { findMany: jest.Mock };
    message: { count: jest.Mock; findMany?: jest.Mock };
    like: { groupBy: jest.Mock; findMany?: jest.Mock };
    comment: { groupBy: jest.Mock };
    repost: { groupBy: jest.Mock; findMany?: jest.Mock };
    commentLike: { groupBy: jest.Mock };
    userBadge: { findMany: jest.Mock };
    savedPost: { findMany: jest.Mock };
    follow: { findMany: jest.Mock };
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'u1',
            username: 'alice',
            displayName: 'Alice',
            avatar: 'avatar1.png',
            isVerified: true,
            primaryBadge: null,
            defaultChatTheme: 'dark',
          },
        ]),
      },
      messageReaction: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            emoji: '👍',
            userId: 'u1',
            messageId: 'm1',
            createdAt: new Date(),
            user: {
              id: 'u1',
              username: 'alice',
              displayName: 'Alice',
              avatar: 'avatar1.png',
              defaultChatTheme: 'dark',
            },
          },
        ]),
      },
      message: {
        count: jest.fn().mockResolvedValue(5),
      },
      like: {
        groupBy: jest.fn().mockResolvedValue([{ postId: 'p1', _count: { _all: 10 } }]),
      },
      comment: {
        groupBy: jest.fn().mockResolvedValue([{ postId: 'p1', _count: { _all: 3 } }]),
      },
      repost: {
        groupBy: jest.fn().mockResolvedValue([{ postId: 'p1', _count: { _all: 2 } }]),
      },
      commentLike: {
        groupBy: jest.fn().mockResolvedValue([{ commentId: 'comm1', _count: { _all: 7 } }]),
      },
      userBadge: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'u1', badgeId: 'badge-gold' }]),
      },
      savedPost: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'u1', postId: 'p1' }]),
      },
      follow: {
        findMany: jest.fn().mockResolvedValue([{ followerId: 'u1', followingId: 'u2' }]),
      },
    };

    mockPrisma.message.findMany = jest.fn().mockResolvedValue([
      {
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        body: 'Hello',
        messageType: 'TEXT',
        createdAt: new Date(),
      },
    ]);

    mockPrisma.like.findMany = jest.fn().mockResolvedValue([{ userId: 'u1', postId: 'p1' }]);
    mockPrisma.repost.findMany = jest.fn().mockResolvedValue([]);

    service = new DataLoaderService(mockPrisma as unknown as PrismaService);
  });

  it('createUserLoader batches user requests by IDs', async () => {
    const loader = service.createUserLoader();
    const [u1, u2] = await Promise.all([loader.load('u1'), loader.load('u2')]);

    expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(u1?.username).toBe('alice');
    expect(u2).toBeNull();
  });

  it('createAvatarLoader batches avatar requests by IDs', async () => {
    const loader = service.createAvatarLoader();
    const [a1, a2] = await Promise.all([loader.load('u1'), loader.load('u2')]);

    expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(a1).toBe('avatar1.png');
    expect(a2).toBeNull();
  });

  it('createMessageReactionsLoader batches reactions by message IDs', async () => {
    const loader = service.createMessageReactionsLoader();
    const [r1, r2] = await Promise.all([loader.load('m1'), loader.load('m2')]);

    expect(mockPrisma.messageReaction.findMany).toHaveBeenCalledTimes(1);
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(0);
  });

  it('createUnreadCountLoader batches conversation unread count queries', async () => {
    const loader = service.createUnreadCountLoader();
    const count = await loader.load({
      conversationId: 'c1',
      userId: 'u1',
      joinedAt: new Date(0),
      lastReadAt: new Date(0),
    });

    expect(count).toBe(5);
    expect(mockPrisma.message.count).toHaveBeenCalledTimes(1);
  });

  it('createPostStatsLoader batches post counts for likes, comments, and reposts', async () => {
    const loader = service.createPostStatsLoader();
    const [p1] = await Promise.all([loader.load('p1')]);

    expect(p1).toEqual({
      likesCount: 10,
      commentsCount: 3,
      repostsCount: 2,
    });
  });

  it('createCommentStatsLoader batches comment counts for likes and replies', async () => {
    mockPrisma.commentLike.groupBy.mockResolvedValueOnce([
      { commentId: 'comm1', _count: { _all: 7 } },
    ]);

    const loader = service.createCommentStatsLoader();
    const [c1] = await Promise.all([loader.load('comm1')]);

    expect(c1).toEqual({
      likesCount: 7,
      repliesCount: 0,
    });
  });

  it('createMessageLoader batches messages by message IDs', async () => {
    const loader = service.createMessageLoader();
    const [m1, m2] = await Promise.all([loader.load('m1'), loader.load('m2')]);

    expect(mockPrisma.message.findMany).toHaveBeenCalledTimes(1);
    expect((m1 as { body: string })?.body).toBe('Hello');
    expect(m2).toBeNull();
  });

  it('createUserBadgesLoader batches user badges by user IDs', async () => {
    const loader = service.createUserBadgesLoader();
    const [b1, b2] = await Promise.all([loader.load('u1'), loader.load('u2')]);

    expect(mockPrisma.userBadge.findMany).toHaveBeenCalledTimes(1);
    expect(b1).toEqual(['badge-gold']);
    expect(b2).toEqual([]);
  });

  it('createUserFollowsLoader batches follow status checks', async () => {
    const loader = service.createUserFollowsLoader();
    const [isFollowing1, isFollowing2] = await Promise.all([
      loader.load({ followerId: 'u1', followingId: 'u2' }),
      loader.load({ followerId: 'u1', followingId: 'u3' }),
    ]);

    expect(mockPrisma.follow.findMany).toHaveBeenCalledTimes(1);
    expect(isFollowing1).toBe(true);
    expect(isFollowing2).toBe(false);
  });

  it('createPostInteractionsLoader batches post interactions', async () => {
    const loader = service.createPostInteractionsLoader();
    const [res] = await Promise.all([loader.load({ userId: 'u1', postId: 'p1' })]);

    expect(res).toEqual({
      isLiked: true,
      isSaved: true,
      isReposted: false,
    });
  });

  it('createScopedLoaders returns fresh instance of all loaders', () => {
    const scoped = service.createScopedLoaders();
    expect(scoped.userLoader).toBeDefined();
    expect(scoped.avatarLoader).toBeDefined();
    expect(scoped.messageReactionsLoader).toBeDefined();
    expect(scoped.unreadCountLoader).toBeDefined();
    expect(scoped.postStatsLoader).toBeDefined();
    expect(scoped.commentStatsLoader).toBeDefined();
    expect(scoped.messageLoader).toBeDefined();
    expect(scoped.userBadgesLoader).toBeDefined();
    expect(scoped.userFollowsLoader).toBeDefined();
    expect(scoped.postInteractionsLoader).toBeDefined();
  });
});
