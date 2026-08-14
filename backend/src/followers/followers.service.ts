import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { FollowStatus, Prisma } from '@prisma/client';
import { FOLLOWERS_REPOSITORY } from './interfaces/followers-repository.interface';
import type { IFollowersRepository } from './interfaces/followers-repository.interface';
import type {
  FollowActionResult,
  GetFollowersResult,
  GetFollowRequestsResult,
} from './types/followers.types';
import { paginate } from '../common/pagination';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { WS_EVENTS } from '../messenger/events/ws-events';
import { toUserProfileDto } from './followers.mapper';

@Injectable()
export class FollowersService {
  constructor(
    @Inject(FOLLOWERS_REPOSITORY)
    private readonly followersRepository: IFollowersRepository,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessengerGateway))
    private readonly gateway: MessengerGateway,
  ) {}

  async getFollowers(
    id: string,
    limit: number,
    after?: string,
    currentUserId?: string,
  ): Promise<GetFollowersResult> {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    const cacheKey = `followers:${id}:${limit}:${after ?? 'first'}:${currentUserId ?? 'anon'}`;

    return this.redis.getOrSet(cacheKey, 60, async () => {
      const rows = await this.followersRepository.getFollowers(id, limit, after);
      const userIds = rows.map((r) => r.user.id);
      let myFollowingsSet = new Set<string>();
      let myFollowersSet = new Set<string>();

      if (currentUserId && userIds.length > 0) {
        const [myFollowings, myFollowers] = await Promise.all([
          this.prisma.follow.findMany({
            where: {
              followerId: currentUserId,
              followingId: { in: userIds },
              status: FollowStatus.ACCEPTED,
            },
            select: { followingId: true },
          }),
          this.prisma.follow.findMany({
            where: {
              followingId: currentUserId,
              followerId: { in: userIds },
              status: FollowStatus.ACCEPTED,
            },
            select: { followerId: true },
          }),
        ]);
        myFollowingsSet = new Set(myFollowings.map((f) => f.followingId));
        myFollowersSet = new Set(myFollowers.map((f) => f.followerId));
      }

      return paginate(rows, limit, (row) => {
        const isFollowing = currentUserId ? myFollowingsSet.has(row.user.id) : false;
        const followsYou = currentUserId ? myFollowersSet.has(row.user.id) : false;
        return toUserProfileDto(row.user, isFollowing, followsYou);
      });
    });
  }

  async getFollowing(
    id: string,
    limit: number,
    after?: string,
    currentUserId?: string,
  ): Promise<GetFollowersResult> {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    const cacheKey = `following:${id}:${limit}:${after ?? 'first'}:${currentUserId ?? 'anon'}`;

    return this.redis.getOrSet(cacheKey, 60, async () => {
      const rows = await this.followersRepository.getFollowing(id, limit, after);
      const userIds = rows.map((r) => r.user.id);
      let myFollowingsSet = new Set<string>();
      let myFollowersSet = new Set<string>();

      if (currentUserId && userIds.length > 0) {
        const [myFollowings, myFollowers] = await Promise.all([
          this.prisma.follow.findMany({
            where: {
              followerId: currentUserId,
              followingId: { in: userIds },
              status: FollowStatus.ACCEPTED,
            },
            select: { followingId: true },
          }),
          this.prisma.follow.findMany({
            where: {
              followingId: currentUserId,
              followerId: { in: userIds },
              status: FollowStatus.ACCEPTED,
            },
            select: { followerId: true },
          }),
        ]);
        myFollowingsSet = new Set(myFollowings.map((f) => f.followingId));
        myFollowersSet = new Set(myFollowers.map((f) => f.followerId));
      }

      return paginate(rows, limit, (row) => {
        const isFollowing = currentUserId ? myFollowingsSet.has(row.user.id) : false;
        const followsYou = currentUserId ? myFollowersSet.has(row.user.id) : false;
        return toUserProfileDto(row.user, isFollowing, followsYou);
      });
    });
  }

  async followUser(followerId: string, followingId: string): Promise<FollowActionResult> {
    if (!followerId || !followingId) {
      throw new BadRequestException('followerId and followingId are required');
    }
    if (followerId === followingId) {
      throw new BadRequestException("You can't follow yourself");
    }

    const isPrivate = await this.followersRepository.isTargetPrivate(followingId);
    if (isPrivate === null) {
      throw new NotFoundException('User not found');
    }
    const initialStatus = isPrivate ? FollowStatus.PENDING : FollowStatus.ACCEPTED;

    try {
      const status = await this.followersRepository.followUser(
        followerId,
        followingId,
        initialStatus,
      );
      await this.invalidateFollowCaches(followerId, followingId);

      // Emit real-time notification to the followed user
      try {
        const follower = await this.prisma.user.findUnique({
          where: { id: followerId },
          select: { id: true, username: true, displayName: true, avatar: true },
        });
        if (follower) {
          this.gateway.emitToUser(followingId, WS_EVENTS.NEW_FOLLOWER, {
            follower: {
              id: follower.id,
              username: follower.username,
              displayName: follower.displayName || follower.username,
              avatar: follower.avatar,
            },
            status,
            message:
              status === FollowStatus.PENDING ? 'sent you a follow request' : 'subscribed to you',
          });
        }
      } catch {
        // Non-blocking notification emission
      }

      return { status };
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
      await this.invalidateFollowCaches(followerId, followingId);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Follow relation not found');
      }
      throw e;
    }
  }

  async getFollowRequests(
    ownerId: string,
    limit: number,
    after?: string,
  ): Promise<GetFollowRequestsResult> {
    if (!ownerId) {
      throw new BadRequestException('ownerId is required');
    }
    const rows = await this.followersRepository.listPendingRequests(ownerId, limit, after);
    return paginate(rows, limit, (row) => row.user);
  }

  async getPendingCount(ownerId: string): Promise<number> {
    return this.followersRepository.pendingCount(ownerId);
  }

  async acceptRequest(ownerId: string, followerId: string): Promise<void> {
    const ok = await this.followersRepository.acceptRequest(ownerId, followerId);
    if (!ok) {
      throw new NotFoundException('Follow request not found');
    }
    await this.invalidateFollowCaches(followerId, ownerId);

    // Emit real-time notification to follower that their request was accepted
    try {
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, username: true, displayName: true, avatar: true },
      });
      if (owner) {
        this.gateway.emitToUser(followerId, WS_EVENTS.NEW_FOLLOWER, {
          follower: {
            id: owner.id,
            username: owner.username,
            displayName: owner.displayName || owner.username,
            avatar: owner.avatar,
          },
          status: FollowStatus.ACCEPTED,
          message: 'accepted your follow request',
        });
      }
    } catch {
      // Non-blocking notification emission
    }
  }

  async rejectRequest(ownerId: string, followerId: string): Promise<void> {
    const ok = await this.followersRepository.rejectRequest(ownerId, followerId);
    if (!ok) {
      throw new NotFoundException('Follow request not found');
    }
    await this.invalidateFollowCaches(followerId, ownerId);
  }

  private async invalidateFollowCaches(followerId: string, followingId: string): Promise<void> {
    await Promise.all([
      this.redis.delByPattern(`followers:${followingId}:*`),
      this.redis.delByPattern(`following:${followerId}:*`),
      this.redis.del(`user${followerId}`),
      this.redis.del(`user${followingId}`),
    ]);
  }
}
