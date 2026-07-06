import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { FOLLOWERS_REPOSITORY } from './interfaces/followers-repository.interface';
import type { IFollowersRepository } from './interfaces/followers-repository.interface';

@Injectable()
export class FollowersService {
  constructor(
    @Inject(FOLLOWERS_REPOSITORY)
    private readonly followersRepository: IFollowersRepository,
  ) {}

  async getFollowers(id: string): Promise<User[]> {
    if (!id) {
      throw new BadRequestException('id is required');
    }
    return this.followersRepository.getFollowers(id);
  }

  async getFollowing(id: string): Promise<User[]> {
    if (!id) {
      throw new BadRequestException('id is required');
    }
    return this.followersRepository.getFollowing(id);
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
