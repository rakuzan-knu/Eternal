import { FollowStatus } from '@prisma/client';
import type { PrismaService } from '@common/prisma';
import { FollowersRepository } from '../followers.repository';

describe('FollowersRepository', () => {
  let repository: FollowersRepository;
  let mockPrisma: {
    follow: {
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };

  const sampleUser = {
    id: 'usr-1',
    username: 'user_one',
    displayName: 'User One',
    avatar: null,
    isVerified: true,
    primaryBadge: null,
  };

  beforeEach(() => {
    mockPrisma = {
      follow: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    repository = new FollowersRepository(mockPrisma as unknown as PrismaService);
  });

  describe('getFollowers & getFollowing', () => {
    it('getFollowers queries accepted followers and maps user', async () => {
      mockPrisma.follow.findMany.mockResolvedValueOnce([{ id: 'f-1', follower: sampleUser }]);

      const result = await repository.getFollowers('usr-target', 10, 'cur-1');

      expect(mockPrisma.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { followingId: 'usr-target', status: FollowStatus.ACCEPTED },
          take: 11,
          skip: 1,
          cursor: { id: 'cur-1' },
        }),
      );
      expect(result).toEqual([{ id: 'f-1', user: sampleUser }]);
    });

    it('getFollowing queries users that given user is following', async () => {
      mockPrisma.follow.findMany.mockResolvedValueOnce([{ id: 'f-2', following: sampleUser }]);

      const result = await repository.getFollowing('usr-source', 10);

      expect(mockPrisma.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { followerId: 'usr-source', status: FollowStatus.ACCEPTED },
          take: 11,
        }),
      );
      expect(result).toEqual([{ id: 'f-2', user: sampleUser }]);
    });
  });

  describe('followUser & unfollowUser', () => {
    it('followUser creates follow row and returns status', async () => {
      mockPrisma.follow.create.mockResolvedValueOnce({ status: FollowStatus.ACCEPTED });

      const status = await repository.followUser('usr-a', 'usr-b', FollowStatus.ACCEPTED);

      expect(mockPrisma.follow.create).toHaveBeenCalledWith({
        data: { followerId: 'usr-a', followingId: 'usr-b', status: FollowStatus.ACCEPTED },
        select: { status: true },
      });
      expect(status).toBe(FollowStatus.ACCEPTED);
    });

    it('unfollowUser deletes unique followerId_followingId row', async () => {
      mockPrisma.follow.delete.mockResolvedValueOnce({});

      await repository.unfollowUser('usr-a', 'usr-b');

      expect(mockPrisma.follow.delete).toHaveBeenCalledWith({
        where: { followerId_followingId: { followerId: 'usr-a', followingId: 'usr-b' } },
      });
    });
  });

  describe('isTargetPrivate, pending requests, accept and reject', () => {
    it('isTargetPrivate returns isPrivate boolean or null', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ isPrivate: true });
      expect(await repository.isTargetPrivate('usr-b')).toBe(true);

      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      expect(await repository.isTargetPrivate('missing-usr')).toBeNull();
    });

    it('listPendingRequests queries pending follows', async () => {
      mockPrisma.follow.findMany.mockResolvedValueOnce([{ id: 'f-pending', follower: sampleUser }]);

      const rows = await repository.listPendingRequests('owner-1', 10);

      expect(mockPrisma.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { followingId: 'owner-1', status: FollowStatus.PENDING },
        }),
      );
      expect(rows).toEqual([{ id: 'f-pending', user: sampleUser }]);
    });

    it('acceptRequest updates status to ACCEPTED and returns true if count > 0', async () => {
      mockPrisma.follow.updateMany.mockResolvedValueOnce({ count: 1 });

      const ok = await repository.acceptRequest('owner-1', 'follower-1');

      expect(mockPrisma.follow.updateMany).toHaveBeenCalledWith({
        where: { followingId: 'owner-1', followerId: 'follower-1', status: FollowStatus.PENDING },
        data: { status: FollowStatus.ACCEPTED },
      });
      expect(ok).toBe(true);
    });

    it('rejectRequest deletes pending row and returns true if count > 0', async () => {
      mockPrisma.follow.deleteMany.mockResolvedValueOnce({ count: 1 });

      const ok = await repository.rejectRequest('owner-1', 'follower-1');

      expect(mockPrisma.follow.deleteMany).toHaveBeenCalledWith({
        where: { followingId: 'owner-1', followerId: 'follower-1', status: FollowStatus.PENDING },
      });
      expect(ok).toBe(true);
    });

    it('pendingCount counts pending follow requests', async () => {
      mockPrisma.follow.count.mockResolvedValueOnce(5);

      const count = await repository.pendingCount('owner-1');

      expect(mockPrisma.follow.count).toHaveBeenCalledWith({
        where: { followingId: 'owner-1', status: FollowStatus.PENDING },
      });
      expect(count).toBe(5);
    });
  });
});
