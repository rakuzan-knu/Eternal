import { Injectable } from '@nestjs/common';
import { IFollowersRepository } from '../interfaces/followers-repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class FollowersRepository implements IFollowersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getFollowers(userId: string): Promise<User[]> {
    const follows = await this.prismaService.follow.findMany({
      where: { followingId: userId },
      include: { follower: true },
    });
    return follows.map((f) => f.follower);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const follows = await this.prismaService.follow.findMany({
      where: { followerId: userId },
      include: { following: true },
    });
    return follows.map((f) => f.following);
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
