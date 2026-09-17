import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FollowStatus, Prisma } from '@prisma/client';
import { FollowersService } from '../followers.service';
import type { RedisService } from '../../redis/redis.service';
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
    getFollowStatusSets: jest.Mock;
    getFollowingIds: jest.Mock;
    getMutualFollowers: jest.Mock;
    findUserBasic: jest.Mock;
  };
  let mockRedis: {
    getOrSet: jest.Mock;
    del: jest.Mock;
    delByPattern: jest.Mock;
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
      getFollowStatusSets: jest.fn().mockResolvedValue({
        myFollowings: ['usr-target'],
        myFollowers: ['usr-target'],
      }),
      getFollowingIds: jest.fn().mockResolvedValue(['usr-target']),
      getMutualFollowers: jest.fn().mockResolvedValue([{ id: 'f-1', user: sampleUser }]),
      findUserBasic: jest.fn().mockResolvedValue({
        id: 'usr-1',
        username: 'follower_user',
        displayName: 'Follower',
        avatar: null,
      }),
    };

    mockRedis = {
      getOrSet: jest
        .fn()
        .mockImplementation((_key: string, _ttl: number, factory: () => unknown) => factory()),
      del: jest.fn().mockResolvedValue(1),
      delByPattern: jest.fn().mockResolvedValue(1),
    };

    mockGateway = {
      emitToUser: jest.fn(),
    };

    service = new FollowersService(
      mockFollowersRepository,
      mockRedis as unknown as RedisService,
      mockGateway as unknown as MessengerGateway,
    );
  });

  describe('getFollowers, getFollowing, getFriends', () => {
    it('getFollowers throws BadRequestException if id is missing', async () => {
      await expect(service.getFollowers('', 10)).rejects.toThrow(BadRequestException);
    });

    it('getFollowing throws BadRequestException if id is missing', async () => {
      await expect(service.getFollowing('', 10)).rejects.toThrow(BadRequestException);
    });

    it('getFriends throws BadRequestException if userId is missing', async () => {
      await expect(service.getFriends('')).rejects.toThrow(BadRequestException);
    });

    it('getFollowers retrieves list, calculates mutual relations, and paginates', async () => {
      mockFollowersRepository.getFollowers.mockResolvedValueOnce([{ id: 'f-1', user: sampleUser }]);
      mockFollowersRepository.getFollowStatusSets.mockResolvedValueOnce({
        myFollowings: ['usr-target'],
        myFollowers: ['usr-target'],
      });

      const result = await service.getFollowers('usr-owner', 10, undefined, 'usr-viewer');

      expect(result.data).toHaveLength(1);
      const firstUser = result.data[0] as unknown as { isFollowing: boolean; followsYou: boolean };
      expect(firstUser.isFollowing).toBe(true);
      expect(firstUser.followsYou).toBe(true);
    });

    it('getFollowing retrieves list of followed users', async () => {
      mockFollowersRepository.getFollowing.mockResolvedValueOnce([{ id: 'f-2', user: sampleUser }]);
      mockFollowersRepository.getFollowStatusSets.mockResolvedValueOnce({
        myFollowings: ['usr-target'],
        myFollowers: ['usr-target'],
      });

      const result = await service.getFollowing('usr-owner', 10, undefined, 'usr-viewer');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].username).toBe('target_user');
    });

    it('getFriends returns mutual friends', async () => {
      mockFollowersRepository.getFollowingIds.mockResolvedValueOnce(['usr-target']);
      mockFollowersRepository.getMutualFollowers.mockResolvedValueOnce([
        { id: 'f-1', user: sampleUser },
      ]);

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
      mockFollowersRepository.findUserBasic.mockResolvedValueOnce({
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
      expect(result.status).toBe(FollowStatus.PENDING);
      expect(mockGateway.emitToUser).toHaveBeenCalled();
    });

    it('follows public user with ACCEPTED status', async () => {
      mockFollowersRepository.isTargetPrivate.mockResolvedValueOnce(false);
      mockFollowersRepository.followUser.mockResolvedValueOnce(FollowStatus.ACCEPTED);
      mockFollowersRepository.findUserBasic.mockResolvedValueOnce({
        id: 'usr-1',
        username: 'follower_user',
        displayName: 'Follower',
        avatar: null,
      });

      const result = await service.followUser('usr-1', 'usr-public');

      expect(mockFollowersRepository.followUser).toHaveBeenCalledWith(
        'usr-1',
        'usr-public',
        FollowStatus.ACCEPTED,
      );
      expect(result.status).toBe(FollowStatus.ACCEPTED);
    });

    it('translates Prisma P2002 conflict and P2003 not found', async () => {
      mockFollowersRepository.isTargetPrivate.mockResolvedValueOnce(false);
      mockFollowersRepository.followUser.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '1' }),
      );

      await expect(service.followUser('usr-1', 'usr-2')).rejects.toThrow(ConflictException);

      mockFollowersRepository.isTargetPrivate.mockResolvedValueOnce(false);
      mockFollowersRepository.followUser.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('nf', { code: 'P2003', clientVersion: '1' }),
      );

      await expect(service.followUser('usr-1', 'usr-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('unfollowUser', () => {
    it('throws BadRequestException if IDs missing', async () => {
      await expect(service.unfollowUser('', 'usr-2')).rejects.toThrow(BadRequestException);
    });

    it('unfollows user and invalidates cache', async () => {
      await service.unfollowUser('usr-1', 'usr-2');
      expect(mockFollowersRepository.unfollowUser).toHaveBeenCalledWith('usr-1', 'usr-2');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('throws NotFoundException on P2025 error', async () => {
      mockFollowersRepository.unfollowUser.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('missing', {
          code: 'P2025',
          clientVersion: '1',
        }),
      );

      await expect(service.unfollowUser('usr-1', 'usr-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Follow Requests: getFollowRequests, acceptRequest, rejectRequest', () => {
    it('getFollowRequests retrieves and paginates requests', async () => {
      mockFollowersRepository.listPendingRequests.mockResolvedValueOnce([
        { id: 'req-1', user: sampleUser },
      ]);

      const requests = await service.getFollowRequests('owner-1', 10);
      expect(requests.data).toHaveLength(1);

      mockFollowersRepository.pendingCount.mockResolvedValueOnce(5);
      const count = await service.getPendingCount('owner-1');
      expect(count).toBe(5);
    });

    it('acceptRequest throws NotFoundException if request is missing', async () => {
      mockFollowersRepository.acceptRequest.mockResolvedValueOnce(false);

      await expect(service.acceptRequest('owner-1', 'follower-1')).rejects.toThrow(
        new NotFoundException('Follow request not found'),
      );
    });

    it('acceptRequest updates status, emits notification, and invalidates cache', async () => {
      mockFollowersRepository.acceptRequest.mockResolvedValueOnce(true);
      mockFollowersRepository.findUserBasic.mockResolvedValueOnce({
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

      mockFollowersRepository.rejectRequest.mockResolvedValueOnce(false);
      await expect(service.rejectRequest('owner-1', 'follower-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
