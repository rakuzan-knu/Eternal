import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FollowStatus, Prisma } from '@prisma/client';
import { FollowersService } from '../followers.service';
import type { RedisService } from '../../redis/redis.service';
import type { PrismaService } from '@common/prisma';
import type { MessengerGateway } from '../../messenger/gateway/messenger.gateway';

describe('FollowersService', () => {
  let service: FollowersService;
  let mockFollowersRepository: {
    getFollowers: jest.Mock;
    getFollowing: jest.Mock;
    followUser: jest.Mock;
    unfollowUser: jest.Mock;
    isTargetPrivate: jest.Mock;
    listPendingRequests: jest.Mock;
    acceptRequest: jest.Mock;
    rejectRequest: jest.Mock;
    pendingCount: jest.Mock;
  };
  let mockRedis: {
    getOrSet: jest.Mock;
    del: jest.Mock;
    delByPattern: jest.Mock;
  };
  let mockPrisma: {
    follow: {
      findMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };
  let mockGateway: {
    emitToUser: jest.Mock;
  };

  const sampleUser = {
    id: 'usr-target',
    username: 'target_user',
    displayName: 'Target User',
    avatar: null,
    bio: 'bio',
    isPrivate: false,
    isVerified: true,
    primaryBadge: null,
    badges: [],
    githubUsername: null,
    mergedPrsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockFollowersRepository = {
      getFollowers: jest.fn().mockResolvedValue([]),
      getFollowing: jest.fn().mockResolvedValue([]),
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      isTargetPrivate: jest.fn(),
      listPendingRequests: jest.fn().mockResolvedValue([]),
      acceptRequest: jest.fn(),
      rejectRequest: jest.fn(),
      pendingCount: jest.fn().mockResolvedValue(0),
    };

    mockRedis = {
      getOrSet: jest
        .fn()
        .mockImplementation((_key: string, _ttl: number, factory: () => unknown) => factory()),
      del: jest.fn().mockResolvedValue(1),
      delByPattern: jest.fn().mockResolvedValue(1),
    };

    mockPrisma = {
      follow: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    mockGateway = {
      emitToUser: jest.fn(),
    };

    service = new FollowersService(
      mockFollowersRepository,
      mockRedis as unknown as RedisService,
      mockPrisma as unknown as PrismaService,
      mockGateway as unknown as MessengerGateway,
    );
  });

  describe('getFollowers, getFollowing, getFriends', () => {
    it('getFollowers throws BadRequestException if id is missing', async () => {
      await expect(service.getFollowers('', 10)).rejects.toThrow(BadRequestException);
    });

    it('getFollowers retrieves list, calculates mutual relations, and paginates', async () => {
      mockFollowersRepository.getFollowers.mockResolvedValueOnce([{ id: 'f-1', user: sampleUser }]);
      mockPrisma.follow.findMany
        .mockResolvedValueOnce([{ followingId: 'usr-target' }]) // myFollowings
        .mockResolvedValueOnce([{ followerId: 'usr-target' }]); // myFollowers

      const result = await service.getFollowers('usr-owner', 10, undefined, 'usr-viewer');

      expect(result.data).toHaveLength(1);
      const firstUser = result.data[0] as unknown as { isFollowing: boolean; followsYou: boolean };
      expect(firstUser.isFollowing).toBe(true);
      expect(firstUser.followsYou).toBe(true);
    });

    it('getFollowing retrieves list of followed users', async () => {
      mockFollowersRepository.getFollowing.mockResolvedValueOnce([{ id: 'f-2', user: sampleUser }]);

      const result = await service.getFollowing('usr-owner', 10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].username).toBe('target_user');
    });

    it('getFriends returns mutual friends', async () => {
      mockPrisma.follow.findMany
        .mockResolvedValueOnce([{ followingId: 'usr-target' }])
        .mockResolvedValueOnce([{ follower: sampleUser }]);

      const friends = await service.getFriends('usr-current');

      expect(friends).toHaveLength(1);
      expect(friends[0].id).toBe('usr-target');
      expect(friends[0].isFollowing).toBe(true);
      expect(friends[0].followsYou).toBe(true);
    });
  });

  describe('followUser', () => {
    it('throws BadRequestException if following self or missing IDs', async () => {
      await expect(service.followUser('', 'usr-2')).rejects.toThrow(BadRequestException);
      await expect(service.followUser('usr-1', 'usr-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if target user does not exist', async () => {
      mockFollowersRepository.isTargetPrivate.mockResolvedValueOnce(null);

      await expect(service.followUser('usr-1', 'usr-missing')).rejects.toThrow(NotFoundException);
    });

    it('follows private user with PENDING status and emits notification', async () => {
      mockFollowersRepository.isTargetPrivate.mockResolvedValueOnce(true);
      mockFollowersRepository.followUser.mockResolvedValueOnce(FollowStatus.PENDING);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'usr-1',
        username: 'follower_user',
        displayName: 'Follower',
        avatar: null,
      });

      const result = await service.followUser('usr-1', 'usr-private');

      expect(mockFollowersRepository.followUser).toHaveBeenCalledWith(
        'usr-1',
        'usr-private',
        FollowStatus.PENDING,
      );
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'usr-private',
        'newFollower',
        expect.objectContaining({ status: FollowStatus.PENDING }),
      );
      expect(result.status).toBe(FollowStatus.PENDING);
    });

    it('handles Prisma P2002 conflict error when already following', async () => {
      mockFollowersRepository.isTargetPrivate.mockResolvedValueOnce(false);
      mockFollowersRepository.followUser.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Duplicate follow', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );

      await expect(service.followUser('usr-1', 'usr-public')).rejects.toThrow(
        new ConflictException('Already following this user'),
      );
    });
  });

  describe('unfollowUser', () => {
    it('unfollows user and clears caches', async () => {
      mockFollowersRepository.unfollowUser.mockResolvedValueOnce(undefined);

      await service.unfollowUser('usr-1', 'usr-2');

      expect(mockFollowersRepository.unfollowUser).toHaveBeenCalledWith('usr-1', 'usr-2');
      expect(mockRedis.delByPattern).toHaveBeenCalledWith('followers:usr-2:*');
    });

    it('throws NotFoundException on P2025 error', async () => {
      mockFollowersRepository.unfollowUser.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: '5.22.0',
        }),
      );

      await expect(service.unfollowUser('usr-1', 'usr-2')).rejects.toThrow(
        new NotFoundException('Follow relation not found'),
      );
    });
  });

  describe('acceptRequest & rejectRequest', () => {
    it('acceptRequest throws NotFoundException if request is missing', async () => {
      mockFollowersRepository.acceptRequest.mockResolvedValueOnce(false);

      await expect(service.acceptRequest('owner-1', 'follower-1')).rejects.toThrow(
        new NotFoundException('Follow request not found'),
      );
    });

    it('acceptRequest updates status, emits notification, and invalidates cache', async () => {
      mockFollowersRepository.acceptRequest.mockResolvedValueOnce(true);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'owner-1',
        username: 'owner_user',
        displayName: 'Owner',
        avatar: null,
      });

      await service.acceptRequest('owner-1', 'follower-1');

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'follower-1',
        'newFollower',
        expect.objectContaining({ status: FollowStatus.ACCEPTED }),
      );
    });

    it('rejectRequest deletes request and invalidates cache', async () => {
      mockFollowersRepository.rejectRequest.mockResolvedValueOnce(true);

      await service.rejectRequest('owner-1', 'follower-1');

      expect(mockFollowersRepository.rejectRequest).toHaveBeenCalledWith('owner-1', 'follower-1');
    });
  });
});
