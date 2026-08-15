/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: (str: string) => str,
}));

import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { USERS_REPOSITORY } from '../interfaces/users-repository.interface';
import { VisibilityResolver } from '../privacy/visibility.resolver';

describe('UsersService - Hybrid Recommendation Algorithm', () => {
  let service: UsersService;
  let prisma: Record<string, any>;
  let redis: Record<string, any>;
  let visibility: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      userBlock: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      follow: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    redis = {
      geoadd: jest.fn().mockResolvedValue(1),
      geodist: jest.fn().mockResolvedValue(null),
      geosearchMembers: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
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
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: USERS_REPOSITORY, useValue: {} },
        { provide: VisibilityResolver, useValue: visibility },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('Metric Normalization & Scoring', () => {
    it('calculates normalized proximity, mutuals, and logarithmic popularity scores', async () => {
      // Viewer follows friend-a
      prisma.follow.findMany.mockImplementation(({ where }: any) => {
        if (where?.followerId === 'viewer-1') {
          return Promise.resolve([{ followingId: 'friend-a' }]);
        }
        if (
          where?.followerId === 'friend-a' ||
          (Array.isArray(where?.followerId?.in) && where.followerId.in.includes('friend-a'))
        ) {
          return Promise.resolve([{ followingId: 'candidate-mutual' }]);
        }
        return Promise.resolve([]);
      });

      // Geo returns candidate-nearby
      redis.geosearchMembers.mockResolvedValue(['candidate-nearby']);
      redis.geodist.mockImplementation((_k: string, _m1: string, m2: string) => {
        if (m2 === 'candidate-nearby') return Promise.resolve(10); // 10 km
        return Promise.resolve(null);
      });

      // DB users query for candidate details
      prisma.user.findMany.mockImplementation(({ where }: any) => {
        const ids: string[] = where?.id?.in ?? [];
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

      prisma.user.findMany.mockImplementation(({ where }: any) => {
        const ids: string[] = where?.id?.in ?? [];
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

      prisma.user.findMany.mockImplementation(({ where }: any) => {
        const ids: string[] = where?.id?.in ?? [];
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

    it('calls redis.dismissSuggestedUser with viewer and target ID', async () => {
      await service.dismissSuggestedUser('viewer-1', 'target-to-dismiss');
      expect(redis.dismissSuggestedUser).toHaveBeenCalledWith('viewer-1', 'target-to-dismiss');
    });
  });
});
