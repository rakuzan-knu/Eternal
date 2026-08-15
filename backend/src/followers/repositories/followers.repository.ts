import { Injectable } from '@nestjs/common';
import { FollowStatus } from '@prisma/client';
import { IFollowersRepository } from '../interfaces/followers-repository.interface';
import { PrismaService } from '@common/prisma';
import { publicUserSelect } from '../../users/users.select';
import type { FollowRequestRow, FollowUserRow } from '../types/followers.types';

@Injectable()
export class FollowersRepository implements IFollowersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getFollowers(userId: string, limit: number, after?: string): Promise<FollowUserRow[]> {
    const follows = await this.prismaService.follow.findMany({
      where: { followingId: userId, status: FollowStatus.ACCEPTED },
      include: { follower: { select: publicUserSelect } },
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return follows.map((f) => ({ id: f.id, user: f.follower }));
  }

  async getFollowing(userId: string, limit: number, after?: string): Promise<FollowUserRow[]> {
    const follows = await this.prismaService.follow.findMany({
      where: { followerId: userId, status: FollowStatus.ACCEPTED },
      include: { following: { select: publicUserSelect } },
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return follows.map((f) => ({ id: f.id, user: f.following }));
  }

  async followUser(
    followerId: string,
    followingId: string,
    status: FollowStatus,
  ): Promise<FollowStatus> {
    const row = await this.prismaService.follow.create({
      data: { followerId, followingId, status },
      select: { status: true },
    });
    return row.status;
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
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((r) => ({ id: r.id, user: r.follower }));
  }

  async acceptRequest(ownerId: string, followerId: string): Promise<boolean> {
    const res = await this.prismaService.follow.updateMany({
      where: { followingId: ownerId, followerId, status: FollowStatus.PENDING },
      data: { status: FollowStatus.ACCEPTED },
    });
    return res.count > 0;
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
}
