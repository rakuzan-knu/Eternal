import { ExceptionMode, FollowStatus, PrivacyDimension, Visibility } from '@prisma/client';
import type { PrismaService } from '@common/prisma';
import { VisibilityResolver } from '../visibility.resolver';

describe('VisibilityResolver', () => {
  let resolver: VisibilityResolver;
  let mockPrisma: {
    userPrivacy: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    privacyException: {
      findMany: jest.Mock;
    };
    follow: {
      findMany: jest.Mock;
    };
    userBlock: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      userPrivacy: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      privacyException: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      follow: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      userBlock: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    resolver = new VisibilityResolver(mockPrisma as unknown as PrismaService);
  });

  describe('loadContext & resolve', () => {
    it('returns true when viewer is owner', async () => {
      const ctx = await resolver.loadContext(['user-1'], 'user-1');
      expect(resolver.resolve(PrivacyDimension.AVATAR, 'user-1', ctx)).toBe(true);
      expect(resolver.resolve(PrivacyDimension.BIRTHDAY, 'user-1', ctx)).toBe(true);
    });

    it('returns false when viewer is blocked by owner or vice-versa', async () => {
      mockPrisma.userBlock.findMany.mockResolvedValueOnce([
        { blockerId: 'user-1', blockedId: 'user-2' },
      ]);

      const ctx = await resolver.loadContext(['user-1'], 'user-2');
      expect(resolver.resolve(PrivacyDimension.AVATAR, 'user-1', ctx)).toBe(false);
    });

    it('respects exception DENY over base EVERYBODY visibility', async () => {
      mockPrisma.userPrivacy.findMany.mockResolvedValueOnce([
        {
          userId: 'user-1',
          avatar: Visibility.EVERYBODY,
        },
      ]);
      mockPrisma.privacyException.findMany.mockResolvedValueOnce([
        {
          ownerId: 'user-1',
          targetId: 'user-2',
          dimension: PrivacyDimension.AVATAR,
          mode: ExceptionMode.DENY,
        },
      ]);

      const ctx = await resolver.loadContext(['user-1'], 'user-2');
      expect(resolver.resolve(PrivacyDimension.AVATAR, 'user-1', ctx)).toBe(false);
    });

    it('respects exception ALLOW over base NOBODY visibility', async () => {
      mockPrisma.userPrivacy.findMany.mockResolvedValueOnce([
        {
          userId: 'user-1',
          birthday: Visibility.NOBODY,
        },
      ]);
      mockPrisma.privacyException.findMany.mockResolvedValueOnce([
        {
          ownerId: 'user-1',
          targetId: 'user-2',
          dimension: PrivacyDimension.BIRTHDAY,
          mode: ExceptionMode.ALLOW,
        },
      ]);

      const ctx = await resolver.loadContext(['user-1'], 'user-2');
      expect(resolver.resolve(PrivacyDimension.BIRTHDAY, 'user-1', ctx)).toBe(true);
    });

    it('resolves CONTACTS visibility based on accepted follow relationship', async () => {
      mockPrisma.userPrivacy.findMany.mockResolvedValueOnce([
        {
          userId: 'user-1',
          bio: Visibility.CONTACTS,
        },
      ]);
      mockPrisma.follow.findMany.mockResolvedValueOnce([
        { followingId: 'user-1', status: FollowStatus.ACCEPTED },
      ]);

      const ctxFollower = await resolver.loadContext(['user-1'], 'follower-user');
      expect(resolver.resolve(PrivacyDimension.BIO, 'user-1', ctxFollower)).toBe(true);
      expect(resolver.isFollower('user-1', ctxFollower)).toBe(true);

      mockPrisma.userPrivacy.findMany.mockResolvedValueOnce([
        {
          userId: 'user-1',
          bio: Visibility.CONTACTS,
        },
      ]);
      mockPrisma.follow.findMany.mockResolvedValueOnce([
        { followingId: 'user-1', status: FollowStatus.PENDING },
      ]);

      const ctxPending = await resolver.loadContext(['user-1'], 'pending-user');
      expect(resolver.resolve(PrivacyDimension.BIO, 'user-1', ctxPending)).toBe(false);
      expect(resolver.isFollower('user-1', ctxPending)).toBe(false);

      mockPrisma.userPrivacy.findMany.mockResolvedValueOnce([
        {
          userId: 'user-1',
          bio: Visibility.CONTACTS,
        },
      ]);
      const ctxAnonymous = await resolver.loadContext(['user-1'], null);
      expect(resolver.resolve(PrivacyDimension.BIO, 'user-1', ctxAnonymous)).toBe(false);
    });
  });

  describe('resolvePresenceAudience', () => {
    it('returns empty set if audience list is empty or contains only owner', async () => {
      const result = await resolver.resolvePresenceAudience('user-1', ['user-1']);
      expect(result.size).toBe(0);
    });

    it('correctly filters audience according to blocks, exceptions, and CONTACTS base visibility', async () => {
      mockPrisma.userPrivacy.findUnique.mockResolvedValueOnce({
        userId: 'user-1',
        lastSeen: Visibility.CONTACTS,
      });

      mockPrisma.privacyException.findMany.mockResolvedValueOnce([
        { mode: ExceptionMode.ALLOW, targetId: 'allowed-non-contact' },
        { mode: ExceptionMode.DENY, targetId: 'denied-contact' },
      ]);

      mockPrisma.follow.findMany.mockResolvedValueOnce([
        { followerId: 'accepted-contact' },
        { followerId: 'denied-contact' },
      ]);

      mockPrisma.userBlock.findMany.mockResolvedValueOnce([
        { blockerId: 'user-1', blockedId: 'blocked-user' },
      ]);

      const viewers = [
        'accepted-contact',
        'denied-contact',
        'allowed-non-contact',
        'stranger',
        'blocked-user',
      ];

      const audience = await resolver.resolvePresenceAudience('user-1', viewers);

      expect(audience.has('accepted-contact')).toBe(true);
      expect(audience.has('allowed-non-contact')).toBe(true);
      expect(audience.has('denied-contact')).toBe(false);
      expect(audience.has('blocked-user')).toBe(false);
      expect(audience.has('stranger')).toBe(false);
    });

    it('includes all non-blocked and non-denied viewers when base is EVERYBODY', async () => {
      mockPrisma.userPrivacy.findUnique.mockResolvedValueOnce({
        userId: 'user-1',
        lastSeen: Visibility.EVERYBODY,
      });

      mockPrisma.privacyException.findMany.mockResolvedValueOnce([
        { mode: ExceptionMode.DENY, targetId: 'denied-user' },
      ]);

      mockPrisma.follow.findMany.mockResolvedValueOnce([]);
      mockPrisma.userBlock.findMany.mockResolvedValueOnce([]);

      const viewers = ['user-a', 'user-b', 'denied-user'];
      const audience = await resolver.resolvePresenceAudience('user-1', viewers);

      expect(audience.has('user-a')).toBe(true);
      expect(audience.has('user-b')).toBe(true);
      expect(audience.has('denied-user')).toBe(false);
    });
  });
});
