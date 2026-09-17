import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AutoDeletePeriod } from '@prisma/client';
import { UsersService } from '../users.service';
import type { RedisService } from '../../redis/redis.service';
import type { VisibilityResolver, VisibilityContext } from '../privacy/visibility.resolver';

jest.mock('argon2', () => ({
  verify: jest
    .fn()
    .mockImplementation((_hash: string, pw: string) => Promise.resolve(pw === 'correct_pw')),
}));

describe('UsersService', () => {
  let service: UsersService;
  let mockUsersRepository: {
    findByEmail: jest.Mock;
    findByUsername: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    updateUser: jest.Mock;
    updateManyLastSeen: jest.Mock;
    updateAvatar: jest.Mock;
    updatePassword: jest.Mock;
    deleteUser: jest.Mock;
    blockUser: jest.Mock;
    unblockUser: jest.Mock;
    findFullProfile: jest.Mock;
    isBlocked: jest.Mock;
    getBlockedIds: jest.Mock;
    findUserAlias: jest.Mock;
    setUserAlias: jest.Mock;
    deleteUserAlias: jest.Mock;
    hasBadge: jest.Mock;
    getUserBadges: jest.Mock;
    searchCandidates: jest.Mock;
    getFollowingIds: jest.Mock;
    getFollowerIds: jest.Mock;
    getRecentChatParticipantIds: jest.Mock;
    getFriendsOfFriends: jest.Mock;
    getPopularUserIds: jest.Mock;
    getCandidateUsersDetails: jest.Mock;
    getNearbyUserCandidates: jest.Mock;
    getRecentPublicPostsContent: jest.Mock;
    getRecentContentsByAuthors: jest.Mock;
    getTopPostsForUsers: jest.Mock;
  };
  let mockRedis: {
    get: jest.Mock;
    mget: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    expire: jest.Mock;
    getOrSet: jest.Mock;
    geoadd: jest.Mock;
    geodist: jest.Mock;
    geodistMany: jest.Mock;
    geosearchMembers: jest.Mock;
    geosearchWithDist: jest.Mock;
    smembers: jest.Mock;
    sadd: jest.Mock;
    dismissSuggestedUser: jest.Mock;
    withLock: jest.Mock;
  };
  let mockVisibility: {
    loadContext: jest.Mock;
    resolve: jest.Mock;
    isFollower: jest.Mock;
    resolvePresenceAudience: jest.Mock;
  };

  const sampleDate = new Date('2026-08-16T12:00:00.000Z');

  const baseDbUser = {
    id: 'usr-100',
    email: 'alex@example.com',
    username: 'alex_dev',
    displayName: 'Alex Dev',
    avatar: 'https://img.com/avatar.png',
    banner: 'https://img.com/banner.png',
    bannerPosition: 50,
    bio: 'Software engineer',
    birthDate: sampleDate,
    passwordHash: 'hashed_pw',
    isPrivate: false,
    isVerified: true,
    primaryBadge: 'veteran',
    githubUsername: 'alexdev',
    mergedPrsCount: 15,
    lastSeenAt: sampleDate,
    autoDeletePeriod: AutoDeletePeriod.OFF,
    createdAt: sampleDate,
    updatedAt: sampleDate,
    badges: [{ badgeId: 'veteran' }],
    followers: [],
    privacy: { allowNearbyRecommendations: true },
    _count: {
      followers: 120,
      following: 85,
      posts: 42,
    },
  };

  beforeEach(() => {
    mockUsersRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByUsername: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(baseDbUser),
      create: jest.fn().mockResolvedValue(baseDbUser),
      updateUser: jest.fn().mockResolvedValue(baseDbUser),
      updateManyLastSeen: jest.fn().mockResolvedValue(undefined),
      updateAvatar: jest.fn(),
      updatePassword: jest.fn().mockResolvedValue(undefined),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      blockUser: jest.fn().mockResolvedValue({ id: 'block-1' }),
      unblockUser: jest.fn().mockResolvedValue({ count: 1 }),
      findFullProfile: jest.fn().mockResolvedValue(baseDbUser),
      isBlocked: jest.fn().mockResolvedValue(false),
      getBlockedIds: jest.fn().mockResolvedValue([]),
      findUserAlias: jest.fn().mockResolvedValue(null),
      setUserAlias: jest.fn().mockResolvedValue(undefined),
      deleteUserAlias: jest.fn().mockResolvedValue(undefined),
      hasBadge: jest.fn().mockResolvedValue(true),
      getUserBadges: jest.fn().mockResolvedValue([]),
      searchCandidates: jest.fn().mockResolvedValue([]),
      getFollowingIds: jest.fn().mockResolvedValue([]),
      getFollowerIds: jest.fn().mockResolvedValue([]),
      getRecentChatParticipantIds: jest.fn().mockResolvedValue([]),
      getFriendsOfFriends: jest.fn().mockResolvedValue([]),
      getPopularUserIds: jest.fn().mockResolvedValue([]),
      getCandidateUsersDetails: jest.fn().mockResolvedValue([]),
      getNearbyUserCandidates: jest.fn().mockResolvedValue([]),
      getRecentPublicPostsContent: jest.fn().mockResolvedValue([]),
      getRecentContentsByAuthors: jest.fn().mockResolvedValue([]),
      getTopPostsForUsers: jest.fn().mockResolvedValue([]),
    };

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      mget: jest.fn().mockImplementation((keys: string[]) => Promise.resolve(keys.map(() => null))),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      getOrSet: jest
        .fn()
        .mockImplementation(
          (
            _k: string,
            _ttl: number | (() => Promise<unknown>),
            factory?: () => Promise<unknown>,
          ) =>
            typeof factory === 'function'
              ? factory()
              : typeof _ttl === 'function'
                ? _ttl()
                : Promise.resolve(baseDbUser),
        ),
      geoadd: jest.fn().mockResolvedValue(1),
      geodist: jest.fn().mockResolvedValue(5),
      geodistMany: jest
        .fn()
        .mockImplementation((_k: string, _m: string, members: string[]) =>
          Promise.resolve(members.map(() => 5)),
        ),
      geosearchMembers: jest.fn().mockResolvedValue(['usr-100']),
      geosearchWithDist: jest.fn().mockResolvedValue([{ member: 'usr-100', distance: 10 }]),
      smembers: jest.fn().mockResolvedValue([]),
      sadd: jest.fn().mockResolvedValue(1),
      dismissSuggestedUser: jest.fn().mockResolvedValue(undefined),
      withLock: jest
        .fn()
        .mockImplementation((_k: string, action: () => Promise<unknown>) => action()),
    };

    mockVisibility = {
      loadContext: jest.fn().mockResolvedValue({
        acceptedFollowing: new Set(),
        pendingFollowing: new Set(),
        isViewerFollower: new Map(),
        isTargetFollower: new Map(),
        isMutual: new Map(),
        isCloseFriend: new Map(),
        isViewerBlocked: new Map(),
        isTargetBlocked: new Map(),
        privacyMap: new Map(),
      }),
      resolve: jest.fn().mockReturnValue(true),
      isFollower: jest.fn().mockReturnValue(false),
      resolvePresenceAudience: jest.fn().mockReturnValue('exact'),
    };

    service = new UsersService(
      mockUsersRepository,
      mockRedis as unknown as RedisService,
      mockVisibility as unknown as VisibilityResolver,
    );
  });

  describe('create & find & deleteAccount', () => {
    it('creates user and returns user', async () => {
      const res = await service.create({
        email: 'alex@example.com',
        username: 'alex_dev',
        displayName: 'Alex',
        passwordHash: 'hashed_pw',
      });
      expect(res.id).toBe('usr-100');
    });

    it('finds by id, username, email', async () => {
      await service.findById('usr-100');
      expect(mockUsersRepository.findById).toHaveBeenCalledWith('usr-100');

      await service.findByUsername('alex_dev');
      expect(mockUsersRepository.findByUsername).toHaveBeenCalledWith('alex_dev');

      await service.findByEmail('alex@example.com');
      expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith('alex@example.com');
    });

    it('updates password hash', async () => {
      await service.updatePasswordHash('usr-100', 'new_hash');
      expect(mockUsersRepository.updatePassword).toHaveBeenCalledWith('usr-100', 'new_hash');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('deleteAccount verifies password and deletes user', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce(baseDbUser);
      await service.deleteAccount('usr-100', 'correct_pw');
      expect(mockUsersRepository.deleteUser).toHaveBeenCalledWith('usr-100');

      mockUsersRepository.findById.mockResolvedValueOnce(baseDbUser);
      await expect(service.deleteAccount('usr-100', 'wrong_pw')).rejects.toThrow(
        UnauthorizedException,
      );

      mockUsersRepository.findById.mockResolvedValueOnce(null);
      await expect(service.deleteAccount('missing', 'correct_pw')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProfileFor & getProfileByUsername & Aliases', () => {
    it('getProfileFor throws NotFoundException if blocked and loads alias if set', async () => {
      mockUsersRepository.isBlocked.mockResolvedValueOnce(true);
      await expect(service.getProfileFor('usr-2', 'usr-1')).rejects.toThrow(NotFoundException);

      mockUsersRepository.isBlocked.mockResolvedValueOnce(false);
      mockUsersRepository.findUserAlias.mockResolvedValueOnce('My Buddy');
      const prof = await service.getProfileFor('usr-100', 'usr-1');
      expect(prof.alias).toBe('My Buddy');
    });

    it('getProfileByUsername rejects reserved names or missing users', async () => {
      await expect(service.getProfileByUsername('admin', null)).rejects.toThrow(NotFoundException);

      mockUsersRepository.findByUsername.mockResolvedValueOnce(null);
      mockUsersRepository.findById.mockResolvedValueOnce(null);
      await expect(service.getProfileByUsername('missing_user', null)).rejects.toThrow(
        NotFoundException,
      );

      mockUsersRepository.findByUsername.mockResolvedValueOnce({ id: 'usr-100' });
      const profile = await service.getProfileByUsername('@alex_dev', null);
      expect(profile.id).toBe('usr-100');
    });

    it('sets and deletes alias with validation', async () => {
      await expect(service.setUserAlias('usr-1', 'usr-1', 'Self')).rejects.toThrow(
        BadRequestException,
      );

      mockUsersRepository.findById.mockResolvedValueOnce(null);
      await expect(service.setUserAlias('usr-1', 'usr-missing', 'Buddy')).rejects.toThrow(
        NotFoundException,
      );

      mockUsersRepository.findById.mockResolvedValueOnce({ id: 'usr-2' });
      const res = await service.setUserAlias('usr-1', 'usr-2', 'Best Buddy');
      expect(res.success).toBe(true);

      const del = await service.deleteUserAlias('usr-1', 'usr-2');
      expect(del.success).toBe(true);
    });
  });

  describe('Blocking & Unblocking', () => {
    it('blocks and unblocks user', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce({ id: 'usr-2' });
      const bRes = await service.blockUser('usr-1', 'usr-2');
      expect(bRes.success).toBe(true);

      const uRes = await service.unblockUser('usr-1', 'usr-2');
      expect(uRes.success).toBe(true);
    });
  });

  describe('Search & Mentions & Suggested Users & Hashtags', () => {
    it('searches users by query and scores relevance', async () => {
      const results = await service.searchUsers('alex', 'usr-1');
      expect(Array.isArray(results)).toBe(true);
    });

    it('searchMentionSuggestions suggests users from followings, followers and recent chats', async () => {
      mockUsersRepository.getFollowingIds.mockResolvedValueOnce(['usr-100']);
      mockUsersRepository.getFollowerIds.mockResolvedValueOnce(['usr-100']);
      mockUsersRepository.getRecentChatParticipantIds.mockResolvedValueOnce(['usr-100']);

      const mentions = await service.searchMentionSuggestions('alex', 'usr-1');
      expect(Array.isArray(mentions)).toBe(true);
    });

    it('gets suggested users and dismisses suggestion', async () => {
      const suggested = await service.getSuggestedUsers('usr-1', 5, '127.0.0.1');
      expect(Array.isArray(suggested)).toBe(true);

      await service.dismissSuggestedUser('usr-1', 'usr-2');
      expect(mockRedis.dismissSuggestedUser).toHaveBeenCalledWith('usr-1', 'usr-2');
    });

    it('gets top followed users', async () => {
      const top = await service.getTopFollowedUsers(5, 'usr-1');
      expect(Array.isArray(top)).toBe(true);
    });

    it('gets trending hashtags and searches hashtags', async () => {
      mockUsersRepository.getRecentPublicPostsContent.mockResolvedValueOnce([
        { content: 'Learning #coding and #typescript today!' },
        { content: 'More #coding practice' },
      ]);
      const tags = await service.getTrendingHashtags(5);
      expect(tags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tag: 'coding' }),
          expect.objectContaining({ tag: 'typescript' }),
        ]),
      );

      mockUsersRepository.getRecentPublicPostsContent.mockResolvedValueOnce([
        { content: 'Learning #coding today!' },
      ]);
      const searched = await service.searchHashtags('#coding');
      expect(searched.length).toBeGreaterThan(0);
    });
  });

  describe('Profile updates: updatePrimaryBadge & touchLastSeen & updateUser', () => {
    it('touches last seen and invalidates cache', async () => {
      await service.touchLastSeen('usr-1');
      expect(mockUsersRepository.updateUser).toHaveBeenCalledWith('usr-1', {
        lastSeenAt: expect.any(Date) as unknown,
      });
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
    });

    it('updateUser validates fields, email conflicts, reserved usernames, and cooldown', async () => {
      await expect(service.updateUser('usr-1', {})).rejects.toThrow(BadRequestException);

      mockUsersRepository.findById.mockResolvedValueOnce(baseDbUser);
      mockUsersRepository.findByEmail.mockResolvedValueOnce({ id: 'other' });
      await expect(service.updateUser('usr-1', { email: 'taken@example.com' })).rejects.toThrow(
        ConflictException,
      );

      mockUsersRepository.findById.mockResolvedValueOnce(baseDbUser);
      await expect(service.updateUser('usr-1', { username: 'admin' })).rejects.toThrow(
        BadRequestException,
      );

      mockUsersRepository.findById.mockResolvedValueOnce(baseDbUser);
      mockRedis.get.mockResolvedValueOnce('some_timestamp');
      await expect(service.updateUser('usr-1', { username: 'new_name' })).rejects.toThrow(
        new BadRequestException('Username can only be changed once every 7 days.'),
      );

      mockUsersRepository.findById.mockResolvedValueOnce(baseDbUser);
      mockRedis.get.mockResolvedValueOnce(null);
      mockUsersRepository.findByUsername.mockResolvedValueOnce({ id: 'other' });
      await expect(service.updateUser('usr-1', { username: 'taken_name' })).rejects.toThrow(
        ConflictException,
      );

      mockUsersRepository.findById.mockResolvedValueOnce(baseDbUser);
      mockRedis.get.mockResolvedValueOnce(null);
      mockUsersRepository.findByUsername.mockResolvedValueOnce(null);
      mockUsersRepository.updateUser.mockResolvedValueOnce(baseDbUser);
      mockUsersRepository.findFullProfile.mockResolvedValueOnce(baseDbUser);

      const res = await service.updateUser('usr-1', { displayName: 'Alex 2' });
      expect(res.id).toBe('usr-100');
    });

    it('updates primary badge when owned and rejects when not owned', async () => {
      mockUsersRepository.hasBadge.mockResolvedValueOnce(true);
      mockUsersRepository.updateUser.mockResolvedValueOnce({
        id: 'usr-1',
        primaryBadge: 'veteran',
      });
      mockUsersRepository.findFullProfile.mockResolvedValueOnce(baseDbUser);

      const res = await service.updatePrimaryBadge('usr-1', 'veteran');
      expect(res.id).toBe('usr-100');

      mockUsersRepository.hasBadge.mockResolvedValueOnce(false);
      await expect(service.updatePrimaryBadge('usr-1', 'unowned-badge')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('sets verified badge and emits notification', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce({ ...baseDbUser, isVerified: false });
      mockUsersRepository.updateUser.mockResolvedValueOnce({ id: 'usr-1', isVerified: true });
      mockUsersRepository.findFullProfile.mockResolvedValueOnce(baseDbUser);

      const res = await service.setVerified('usr-1', true);
      expect(res.id).toBe('usr-100');
    });

    it('applyPrivacy handles private profile, avatar privacy, and lastSeen granularity', () => {
      const privateRaw = {
        ...baseDbUser,
        badges: ['veteran'],
        followersCount: 120,
        followingCount: 85,
        postsCount: 42,
        isPrivate: true,
        lastSeenAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        createdAt: sampleDate.toISOString(),
        updatedAt: sampleDate.toISOString(),
        birthDate: null,
      };

      const mockCtx: VisibilityContext = {
        viewerId: 'viewer-stranger',
        exceptions: new Map(),
        visibility: new Map(),
        acceptedFollowing: new Set(),
        pendingFollowing: new Set(),
        blocked: new Set(),
      };

      mockVisibility.isFollower.mockReturnValueOnce(false);
      const privateProf = service.applyPrivacy(privateRaw, 'viewer-stranger', mockCtx);
      expect(privateProf.bio).toBeNull();

      mockVisibility.isFollower.mockReturnValueOnce(true);
      mockVisibility.resolve.mockReturnValue(false); // hides avatar and last seen
      const hiddenProf = service.applyPrivacy(privateRaw, 'viewer-follower', {
        ...mockCtx,
        viewerId: 'viewer-follower',
      });
      expect(hiddenProf.avatar).toBeNull();
      expect(hiddenProf.isOnline).toBe(false);
    });
  });
});
