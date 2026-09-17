/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: (str: string) => str,
}));

import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { RedisService } from '../../redis/redis.service';
import { USERS_REPOSITORY } from '../interfaces/users-repository.interface';
import { VisibilityResolver } from '../privacy/visibility.resolver';

describe('UsersService - Hybrid Recommendation Algorithm', () => {
  let service: UsersService;
  let mockUsersRepo: Record<string, any>;
  let redis: Record<string, any>;
  let visibility: Record<string, any>;

  beforeEach(async () => {
    mockUsersRepo = {
      getBlockedIds: jest.fn().mockResolvedValue([]),
      getFollowingIds: jest.fn().mockResolvedValue([]),
      getFriendsOfFriends: jest.fn().mockResolvedValue([]),
      getPopularUserIds: jest.fn().mockResolvedValue([]),
      getCandidateUsersDetails: jest.fn().mockResolvedValue([]),
      getRecentContentsByAuthors: jest.fn().mockResolvedValue([]),
      getRecentPublicPostsContent: jest.fn().mockResolvedValue([]),
      getNearbyUserCandidates: jest.fn().mockResolvedValue([]),
      getTopPostsForUsers: jest.fn().mockResolvedValue([]),
    };

    redis = {
      geoadd: jest.fn().mockResolvedValue(1),
      geodist: jest.fn().mockResolvedValue(null),
      geodistMany: jest
        .fn()
        .mockImplementation((_k: string, _m: string, members: string[]) =>
          Promise.resolve(members.map((m: string) => (m === 'candidate-nearby' ? 10 : null))),
        ),
      geosearchMembers: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      mget: jest.fn().mockImplementation((keys: string[]) => Promise.resolve(keys.map(() => null))),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
      dismissSuggestedUser: jest.fn().mockResolvedValue(undefined),
    };

    visibility = {
      loadContext: jest.fn().mockResolvedValue({
        viewerId: 'viewer-1',
        exceptions: new Map(),
        visibility: new Map(),
        acceptedFollowing: new Set(),
        pendingFollowing: new Set(),
        blocked: new Set(),
      }),
      isFollower: jest.fn().mockReturnValue(false),
      resolve: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: RedisService, useValue: redis },
        { provide: USERS_REPOSITORY, useValue: mockUsersRepo },
        { provide: VisibilityResolver, useValue: visibility },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('Metric Normalization & Scoring', () => {
    it('calculates normalized proximity, mutuals, and logarithmic popularity scores', async () => {
      mockUsersRepo.getFollowingIds.mockResolvedValue(['friend-a']);
      mockUsersRepo.getFriendsOfFriends.mockResolvedValue(['candidate-mutual']);

      // Geo returns candidate-nearby
      redis.geosearchMembers.mockResolvedValue(['candidate-nearby']);
      redis.geodist.mockImplementation((_k: string, _m1: string, m2: string) => {
        if (m2 === 'candidate-nearby') return Promise.resolve(10); // 10 km
        return Promise.resolve(null);
      });

      // DB users query for candidate details
      mockUsersRepo.getCandidateUsersDetails.mockImplementation((ids: string[]) => {
        return Promise.resolve(
          ids.map((id) => {
            if (id === 'candidate-mutual') {
              return {
                id: 'candidate-mutual',
                username: 'alex',
                displayName: 'Alex',
                avatar: 'https://cdn.example.com/alex.jpg',
                isVerified: false,
                privacy: { allowNearbyRecommendations: true },
                _count: { followers: 100 },
                followers: [
                  {
                    followerId: 'friend-a',
                    follower: {
                      id: 'friend-a',
                      username: 'ben',
                      avatar: 'https://cdn.example.com/ben.jpg',
                    },
                  },
                  {
                    followerId: 'friend-b',
                    follower: {
                      id: 'friend-b',
                      username: 'ilona',
                      avatar: 'https://cdn.example.com/ilona.jpg',
                    },
                  },
                ],
              };
            }
            return {
              id: 'candidate-nearby',
              username: 'neighbor',
              displayName: 'Neighbor',
              avatar: null,
              isVerified: true,
              privacy: { allowNearbyRecommendations: true },
              _count: { followers: 5 },
              followers: [],
            };
          }),
        );
      });

      const suggestions = await service.getSuggestedUsers(
        'viewer-1',
        5,
        '127.0.0.1',
        {},
        { latitude: 50.4501, longitude: 30.5234 },
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(2);
      const mutualCandidate = suggestions.find((s) => s.id === 'candidate-mutual');
      const nearbyCandidate = suggestions.find((s) => s.id === 'candidate-nearby');

      expect(mutualCandidate).toBeDefined();
      expect(mutualCandidate?.recommendationReason?.type).toBe('MUTUAL_FRIENDS');
      expect(mutualCandidate?.recommendationReason?.mutualFriends?.length).toBeGreaterThan(0);

      expect(nearbyCandidate).toBeDefined();
      expect(nearbyCandidate?.recommendationReason?.type).toBe('NEARBY');
      expect(nearbyCandidate?.recommendationReason?.text).toBe('Near you');
    });

    it('respects allowNearbyRecommendations: false by ignoring proximity scoring', async () => {
      redis.geosearchMembers.mockResolvedValue(['candidate-nearby']);
      redis.geodist.mockResolvedValue(5);

      mockUsersRepo.getCandidateUsersDetails.mockImplementation((ids: string[]) => {
        return Promise.resolve(
          ids.map((id) => ({
            id,
            username: 'private_geo_user',
            displayName: 'Private Geo',
            avatar: null,
            isVerified: false,
            privacy: { allowNearbyRecommendations: false }, // User opted out of geo
            _count: { followers: 10 },
            followers: [],
          })),
        );
      });

      const suggestions = await service.getSuggestedUsers(
        'viewer-1',
        5,
        '127.0.0.1',
        {},
        { latitude: 50.4501, longitude: 30.5234 },
      );

      const candidate = suggestions.find((s) => s.id === 'candidate-nearby');
      expect(candidate).toBeDefined();
      // Should NOT have proximity reason because allowNearbyRecommendations is false
      expect(candidate?.recommendationReason?.type).not.toBe('NEARBY');
    });

    it('excludes dismissed suggestion IDs from candidate pool', async () => {
      // Mock Redis dismissed set containing dismissed-user
      redis.smembers.mockResolvedValue(['dismissed-user']);
      redis.geosearchMembers.mockResolvedValue(['dismissed-user', 'valid-user']);

      mockUsersRepo.getCandidateUsersDetails.mockImplementation((ids: string[]) => {
        return Promise.resolve(
          ids.map((id) => ({
            id,
            username: id === 'dismissed-user' ? 'dismissed_user' : 'valid_user',
            displayName: id === 'dismissed-user' ? 'Dismissed' : 'Valid',
            avatar: null,
            isVerified: false,
            privacy: { allowNearbyRecommendations: true },
            _count: { followers: 10 },
            followers: [],
          })),
        );
      });

      const suggestions = await service.getSuggestedUsers(
        'viewer-1',
        5,
        '127.0.0.1',
        {},
        { latitude: 50.4501, longitude: 30.5234 },
      );

      const dismissedFound = suggestions.find((s) => s.id === 'dismissed-user');
      const validFound = suggestions.find((s) => s.id === 'valid-user');

      expect(dismissedFound).toBeUndefined();
      expect(validFound).toBeDefined();
    });

    it('FEED_PRESET=balanced reorders vs legacy (A/B seam)', async () => {
      // A: popularity-heavy (pop 1.0). B: proximity-heavy (prox 0.45 at 55km).
      // legacy:  A 0.20 > B 0.18.  balanced: A 0.15 < B 0.1575. Order flips.
      redis.geosearchMembers.mockResolvedValue(['cand-pop', 'cand-prox']);
      redis.geodistMany.mockImplementation((_k: string, _m: string, members: string[]) =>
        Promise.resolve(members.map((m: string) => (m === 'cand-prox' ? 55 : null))),
      );
      mockUsersRepo.getCandidateUsersDetails.mockImplementation((ids: string[]) =>
        Promise.resolve(
          ids.map((id) => ({
            id,
            username: id.replace('-', '_'),
            displayName: id,
            avatar: null,
            isVerified: false,
            privacy: { allowNearbyRecommendations: true },
            _count: { followers: id === 'cand-pop' ? 9999 : 0 },
            followers: [],
          })),
        ),
      );
      mockUsersRepo.getRecentContentsByAuthors.mockResolvedValue([]);
      mockUsersRepo.getRecentPublicPostsContent.mockResolvedValue([]);

      const run = () =>
        service.getSuggestedUsers(
          'viewer-1',
          5,
          '127.0.0.1',
          {},
          { latitude: 50.4501, longitude: 30.5234 },
        );

      delete process.env.FEED_PRESET;
      const legacyOrder = (await run()).map((s) => s.id);
      expect(legacyOrder[0]).toBe('cand-pop');

      process.env.FEED_PRESET = 'balanced';
      try {
        const balancedOrder = (await run()).map((s) => s.id);
        expect(balancedOrder[0]).toBe('cand-prox');
      } finally {
        delete process.env.FEED_PRESET;
      }
    });

    it('calls redis.dismissSuggestedUser with viewer and target ID', async () => {
      await service.dismissSuggestedUser('viewer-1', 'target-to-dismiss');
      expect(redis.dismissSuggestedUser).toHaveBeenCalledWith('viewer-1', 'target-to-dismiss');
    });

    it('preloads cities and distances in exactly 2 Redis roundtrips (N+1 guard)', async () => {
      redis.geosearchMembers.mockResolvedValue(['cand-a', 'cand-b', 'cand-c']);
      mockUsersRepo.getCandidateUsersDetails.mockImplementation((ids: string[]) =>
        Promise.resolve(
          ids.map((id) => ({
            id,
            username: id.replace('-', '_'),
            displayName: id,
            avatar: null,
            isVerified: false,
            privacy: { allowNearbyRecommendations: true },
            _count: { followers: 1 },
            followers: [],
          })),
        ),
      );
      redis.mget.mockClear();
      redis.geodistMany.mockClear();
      redis.get.mockClear();
      redis.geodist.mockClear();

      await service.getSuggestedUsers(
        'viewer-1',
        5,
        '127.0.0.1',
        {},
        { latitude: 50.4501, longitude: 30.5234 },
      );

      // ONE mget for all cities, ONE pipeline for all distances — never N calls.
      expect(redis.mget).toHaveBeenCalledTimes(1);
      expect(redis.mget.mock.calls[0][0]).toHaveLength(3);
      expect(redis.geodistMany).toHaveBeenCalledTimes(1);
      expect(redis.geodistMany.mock.calls[0][2]).toHaveLength(3);
      expect(redis.get).not.toHaveBeenCalled();
      expect(redis.geodist).not.toHaveBeenCalled();
    });
  });
});
