import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FOLLOWERS_REPOSITORY } from './interfaces/followers-repository.interface';
import type { IFollowersRepository } from './interfaces/followers-repository.interface';
import type { GetFollowersResult } from './types/followers.types';
import { paginate } from '../common/pagination';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class FollowersService {
  constructor(
    @Inject(FOLLOWERS_REPOSITORY)
    private readonly followersRepository: IFollowersRepository,
    private readonly redis: RedisService,
  ) {}

  async getFollowers(id: string, limit: number, after?: string): Promise<GetFollowersResult> {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    const key = `followers:${id}:${limit}:${after ?? 'first'}`;

    return this.redis.getOrSet(key, 60, async () => {
      const rows = await this.followersRepository.getFollowers(id, limit, after);
      return paginate(rows, limit, (row) => row.user);
    });
  }

  async getFollowing(id: string, limit: number, after?: string): Promise<GetFollowersResult> {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    const key = `following:${id}:${limit}:${after ?? 'first'}`;

    return this.redis.getOrSet(key, 60, async () => {
      const rows = await this.followersRepository.getFollowing(id, limit, after);
      return paginate(rows, limit, (row) => row.user);
    });
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    if (!followerId || !followingId) {
      throw new BadRequestException('followerId and followingId are required');
    }
    if (followerId === followingId) {
      throw new BadRequestException("You can't follow yourself");
    }
    try {
      await this.followersRepository.followUser(followerId, followingId);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException('Already following this user');
        }
        if (e.code === 'P2003') {
          throw new NotFoundException('User not found');
        }
      }
      throw e;
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    if (!followerId || !followingId) {
      throw new BadRequestException('followerId and followingId are required');
    }
    try {
      await this.followersRepository.unfollowUser(followerId, followingId);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Follow relation not found');
      }
      throw e;
    }
  }
}
