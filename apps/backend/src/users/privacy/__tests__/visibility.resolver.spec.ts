import { ExceptionMode, FollowStatus, PrivacyDimension, Visibility } from '@prisma/client';
import { VisibilityResolver } from '../visibility.resolver';
import type { IPrivacyRepository } from '../interfaces/privacy-repository.interface';

describe('VisibilityResolver', () => {
  let resolver: VisibilityResolver;
  let mockPrivacyRepo: {
    loadVisibilityContextData: jest.Mock;
    loadPresenceAudienceData: jest.Mock;
  };

  beforeEach(() => {
    mockPrivacyRepo = {
      loadVisibilityContextData: jest.fn().mockResolvedValue({
        privacyRows: [],
        exceptionRows: [],
        followRows: [],
        blockRows: [],
      }),
      loadPresenceAudienceData: jest.fn().mockResolvedValue({
        privacyRow: null,
        exceptionRows: [],
        followRows: [],
        blockRows: [],
      }),
    };

    resolver = new VisibilityResolver(mockPrivacyRepo as unknown as IPrivacyRepository);
  });

  describe('loadContext & resolve', () => {
    it('returns true when viewer is owner', async () => {
      const ctx = await resolver.loadContext(['user-1'], 'user-1');
      expect(resolver.resolve(PrivacyDimension.AVATAR, 'user-1', ctx)).toBe(true);
      expect(resolver.resolve(PrivacyDimension.BIRTHDAY, 'user-1', ctx)).toBe(true);
    });

    it('returns false when viewer is blocked by owner or vice-versa', async () => {
      mockPrivacyRepo.loadVisibilityContextData.mockResolvedValueOnce({
        privacyRows: [],
        exceptionRows: [],
        followRows: [],
        blockRows: [{ blockerId: 'user-1', blockedId: 'user-2' }],
      });

      const ctx = await resolver.loadContext(['user-1'], 'user-2');
      expect(resolver.resolve(PrivacyDimension.AVATAR, 'user-1', ctx)).toBe(false);
    });

    it('respects exception DENY over base EVERYBODY visibility', async () => {
      mockPrivacyRepo.loadVisibilityContextData.mockResolvedValueOnce({
        privacyRows: [
          {
            userId: 'user-1',
            avatar: Visibility.EVERYBODY,
          },
        ],
        exceptionRows: [
          {
            ownerId: 'user-1',
            targetId: 'user-2',
            dimension: PrivacyDimension.AVATAR,
            mode: ExceptionMode.DENY,
          },
        ],
        followRows: [],
        blockRows: [],
      });

      const ctx = await resolver.loadContext(['user-1'], 'user-2');
      expect(resolver.resolve(PrivacyDimension.AVATAR, 'user-1', ctx)).toBe(false);
    });

    it('respects exception ALLOW over base NOBODY visibility', async () => {
      mockPrivacyRepo.loadVisibilityContextData.mockResolvedValueOnce({
        privacyRows: [
          {
            userId: 'user-1',
            birthday: Visibility.NOBODY,
          },
        ],
        exceptionRows: [
          {
            ownerId: 'user-1',
            targetId: 'user-2',
            dimension: PrivacyDimension.BIRTHDAY,
            mode: ExceptionMode.ALLOW,
          },
        ],
        followRows: [],
        blockRows: [],
      });

      const ctx = await resolver.loadContext(['user-1'], 'user-2');
      expect(resolver.resolve(PrivacyDimension.BIRTHDAY, 'user-1', ctx)).toBe(true);
    });

    it('resolves CONTACTS visibility based on accepted follow relationship', async () => {
      mockPrivacyRepo.loadVisibilityContextData.mockResolvedValueOnce({
        privacyRows: [
          {
            userId: 'user-1',
            bio: Visibility.CONTACTS,
          },
        ],
        exceptionRows: [],
        followRows: [{ followingId: 'user-1', status: FollowStatus.ACCEPTED }],
        blockRows: [],
      });

      const ctxFollower = await resolver.loadContext(['user-1'], 'follower-user');
      expect(resolver.resolve(PrivacyDimension.BIO, 'user-1', ctxFollower)).toBe(true);
      expect(resolver.isFollower('user-1', ctxFollower)).toBe(true);

      mockPrivacyRepo.loadVisibilityContextData.mockResolvedValueOnce({
        privacyRows: [
          {
            userId: 'user-1',
            bio: Visibility.CONTACTS,
          },
        ],
        exceptionRows: [],
        followRows: [{ followingId: 'user-1', status: FollowStatus.PENDING }],
        blockRows: [],
      });

      const ctxPending = await resolver.loadContext(['user-1'], 'pending-user');
      expect(resolver.resolve(PrivacyDimension.BIO, 'user-1', ctxPending)).toBe(false);
      expect(resolver.isFollower('user-1', ctxPending)).toBe(false);

      mockPrivacyRepo.loadVisibilityContextData.mockResolvedValueOnce({
        privacyRows: [
          {
            userId: 'user-1',
            bio: Visibility.CONTACTS,
          },
        ],
        exceptionRows: [],
        followRows: [],
        blockRows: [],
      });
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
      mockPrivacyRepo.loadPresenceAudienceData.mockResolvedValueOnce({
        privacyRow: {
          userId: 'user-1',
          lastSeen: Visibility.CONTACTS,
        },
        exceptionRows: [
          { mode: ExceptionMode.ALLOW, targetId: 'allowed-non-contact' },
          { mode: ExceptionMode.DENY, targetId: 'denied-contact' },
        ],
        followRows: [{ followerId: 'accepted-contact' }, { followerId: 'denied-contact' }],
        blockRows: [{ blockerId: 'user-1', blockedId: 'blocked-user' }],
      });

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
      mockPrivacyRepo.loadPresenceAudienceData.mockResolvedValueOnce({
        privacyRow: {
          userId: 'user-1',
          lastSeen: Visibility.EVERYBODY,
        },
        exceptionRows: [{ mode: ExceptionMode.DENY, targetId: 'denied-user' }],
        followRows: [],
        blockRows: [],
      });

      const viewers = ['user-a', 'user-b', 'denied-user'];
      const audience = await resolver.resolvePresenceAudience('user-1', viewers);

      expect(audience.has('user-a')).toBe(true);
      expect(audience.has('user-b')).toBe(true);
      expect(audience.has('denied-user')).toBe(false);
    });
  });
});
