import { ForbiddenException, Injectable } from '@nestjs/common';
import { FollowStatus } from '@prisma/client';
import { IFollowersRepository } from '../interfaces/followers-repository.interface';
import { PrismaService } from '@common/prisma';
import { chunkArray } from '@common/utils/batch-stream.util';
import { publicUserSelect } from '../../users/users.select';
import { RelationStateMachine } from '../domain/relation-state-machine';
import type {
  FollowRequestRow,
  FollowShowcaseSummary,
  FollowUserRow,
} from '../types/followers.types';

@Injectable()
export class FollowersRepository implements IFollowersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getFollowers(userId: string, limit: number, after?: string): Promise<FollowUserRow[]> {
    const follows = await this.prismaService.follow.findMany({
      where: { followingId: userId, status: FollowStatus.ACCEPTED },
      include: { follower: { select: publicUserSelect } },
      take: limit + 1,
      skip: after ? 1 : 0,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(after ? { cursor: { id: after } } : {}),
    });
    return follows.map((f) => ({ id: f.id, user: f.follower }));
  }

  async getFollowing(userId: string, limit: number, after?: string): Promise<FollowUserRow[]> {
    const follows = await this.prismaService.follow.findMany({
      where: { followerId: userId, status: FollowStatus.ACCEPTED },
      include: { following: { select: publicUserSelect } },
      take: limit + 1,
      skip: after ? 1 : 0,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(after ? { cursor: { id: after } } : {}),
    });
    return follows.map((f) => ({ id: f.id, user: f.following }));
  }

  async followUser(
    followerId: string,
    followingId: string,
    status: FollowStatus,
  ): Promise<FollowStatus> {
    return this.prismaService.$transaction(async (tx) => {
      // Deterministically sort to prevent database deadlocks
      RelationStateMachine.getOrderedPair(followerId, followingId);

      // Verify no block exists in either direction
      const block = await tx.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: followerId, blockedId: followingId },
            { blockerId: followingId, blockedId: followerId },
          ],
        },
      });

      if (block) {
        throw new ForbiddenException('Cannot follow user: relationship is in BLOCKED state');
      }

      const row = await tx.follow.create({
        data: { followerId, followingId, status },
        select: { status: true },
      });
      return row.status;
    });
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await this.prismaService.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
  }

  async isTargetPrivate(followingId: string): Promise<boolean | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id: followingId },
      select: { isPrivate: true },
    });
    return user ? user.isPrivate : null;
  }

  async listPendingRequests(
    ownerId: string,
    limit: number,
    after?: string,
  ): Promise<FollowRequestRow[]> {
    const rows = await this.prismaService.follow.findMany({
      where: { followingId: ownerId, status: FollowStatus.PENDING },
      include: { follower: { select: publicUserSelect } },
      take: limit + 1,
      skip: after ? 1 : 0,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(after ? { cursor: { id: after } } : {}),
    });
    return rows.map((r) => ({ id: r.id, user: r.follower }));
  }

  async acceptRequest(ownerId: string, followerId: string): Promise<boolean> {
    return this.prismaService.$transaction(async (tx) => {
      // Check block state
      const block = await tx.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: ownerId, blockedId: followerId },
            { blockerId: followerId, blockedId: ownerId },
          ],
        },
      });

      if (block) {
        await tx.follow.deleteMany({
          where: { followingId: ownerId, followerId },
        });
        throw new ForbiddenException('Cannot accept request: relationship is in BLOCKED state');
      }

      const res = await tx.follow.updateMany({
        where: { followingId: ownerId, followerId, status: FollowStatus.PENDING },
        data: { status: FollowStatus.ACCEPTED },
      });
      return res.count > 0;
    });
  }

  async rejectRequest(ownerId: string, followerId: string): Promise<boolean> {
    const res = await this.prismaService.follow.deleteMany({
      where: { followingId: ownerId, followerId, status: FollowStatus.PENDING },
    });
    return res.count > 0;
  }

  pendingCount(ownerId: string): Promise<number> {
    return this.prismaService.follow.count({
      where: { followingId: ownerId, status: FollowStatus.PENDING },
    });
  }

  async getFollowStatusSets(
    currentUserId: string,
    targetIds: string[],
  ): Promise<{ myFollowings: string[]; myFollowers: string[] }> {
    const uniqueTargets = [...new Set(targetIds)];
    const batches = chunkArray(uniqueTargets, 500);

    const myFollowings: string[] = [];
    const myFollowers: string[] = [];

    for (const batch of batches) {
      const [following, followers] = await Promise.all([
        this.prismaService.follow.findMany({
          where: {
            followerId: currentUserId,
            followingId: { in: batch },
            status: FollowStatus.ACCEPTED,
          },
          select: { followingId: true },
        }),
        this.prismaService.follow.findMany({
          where: {
            followingId: currentUserId,
            followerId: { in: batch },
            status: FollowStatus.ACCEPTED,
          },
          select: { followerId: true },
        }),
      ]);

      myFollowings.push(...following.map((a) => a.followingId));
      myFollowers.push(...followers.map((p) => p.followerId));
    }

    return {
      myFollowings,
      myFollowers,
    };
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const following = await this.prismaService.follow.findMany({
      where: { followerId: userId, status: FollowStatus.ACCEPTED },
      select: { followingId: true },
      take: 5000,
    });
    return following.map((f) => f.followingId);
  }

  async getMutualFollowers(
    userId: string,
    viewerFollowingIds: string[],
    limit: number,
  ): Promise<FollowUserRow[]> {
    const mutualFollows = await this.prismaService.follow.findMany({
      where: {
        followingId: userId,
        followerId: { in: viewerFollowingIds },
        status: FollowStatus.ACCEPTED,
      },
      include: {
        follower: {
          select: {
            ...publicUserSelect,
            showcase: {
              select: {
                activityStatus: true,
                connectedAccounts: true,
                privacyActivity: true,
              },
            },
          },
        },
      },
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return mutualFollows.map((f) => ({
      id: f.id,
      user: {
        ...f.follower,
        showcase: f.follower.showcase
          ? {
              privacyActivity: f.follower.showcase.privacyActivity,
              connectedAccounts: f.follower.showcase
                .connectedAccounts as FollowShowcaseSummary['connectedAccounts'],
              activityStatus: f.follower.showcase
                .activityStatus as FollowShowcaseSummary['activityStatus'],
            }
          : null,
      },
    }));
  }

  async findUserBasic(userId: string) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, avatar: true },
    });
  }
}
