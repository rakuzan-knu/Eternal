import { Injectable } from '@nestjs/common';
import { IFollowersRepository } from '../interfaces/followers-repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { publicUserSelect } from '../../users/users.select';
import type { FollowUserRow } from '../types/followers.types';

@Injectable()
export class FollowersRepository implements IFollowersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getFollowers(userId: string, limit: number, after?: string): Promise<FollowUserRow[]> {
    const follows = await this.prismaService.follow.findMany({
      where: { followingId: userId },
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
      where: { followerId: userId },
      include: { following: { select: publicUserSelect } },
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return follows.map((f) => ({ id: f.id, user: f.following }));
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    await this.prismaService.follow.create({
      data: { followerId, followingId },
    });
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await this.prismaService.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
  }
}
