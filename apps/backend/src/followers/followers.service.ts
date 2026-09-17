import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FollowStatus, NotificationType, Prisma } from '@prisma/client';
import {
  CreateNotificationEvent,
  NOTIFICATION_EVENTS,
} from '../notifications/events/notification.events';
import { FOLLOWERS_REPOSITORY } from './interfaces/followers-repository.interface';
import type { IFollowersRepository } from './interfaces/followers-repository.interface';
import type {
  FollowActionResult,
  GetFollowersResult,
  GetFollowRequestsResult,
} from './types/followers.types';
import { paginate } from '../common/pagination';
import { RedisService } from '../redis/redis.service';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { WS_EVENTS } from '../messenger/events/ws-events';
import { toUserProfileDto } from './followers.mapper';
import type { LiveActivityStatusDto, UserProfileDto } from '@common/contracts';

@Injectable()
export class FollowersService {
  private readonly logger = new Logger(FollowersService.name);

  constructor(
    @Inject(FOLLOWERS_REPOSITORY)
    private readonly followersRepository: IFollowersRepository,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => MessengerGateway))
    @Optional()
    private readonly gateway?: MessengerGateway,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
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
        const { myFollowings, myFollowers } = await this.followersRepository.getFollowStatusSets(
          currentUserId,
          userIds,
        );
        myFollowingsSet = new Set(myFollowings);
        myFollowersSet = new Set(myFollowers);
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
        const { myFollowings, myFollowers } = await this.followersRepository.getFollowStatusSets(
          currentUserId,
          userIds,
        );
        myFollowingsSet = new Set(myFollowings);
        myFollowersSet = new Set(myFollowers);
      }

      return paginate(rows, limit, (row) => {
        const isFollowing = currentUserId ? myFollowingsSet.has(row.user.id) : false;
        const followsYou = currentUserId ? myFollowersSet.has(row.user.id) : false;
        return toUserProfileDto(row.user, isFollowing, followsYou);
      });
    });
  }

  async getFriends(userId: string): Promise<UserProfileDto[]> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const cacheKey = `friends:${userId}`;

    return this.redis.getOrSet(cacheKey, 30, async () => {
      // 1. Find all users I follow with ACCEPTED status
      const followingIds = await this.followersRepository.getFollowingIds(userId);
      if (followingIds.length === 0) return [];

      // 2. Find which of these users also follow me with ACCEPTED status (mutual)
      const mutualRows = await this.followersRepository.getMutualFollowers(
        userId,
        followingIds,
        100,
      );
      return mutualRows.map((r) => {
        const showcase = r.user.showcase;
        let activityStatus: LiveActivityStatusDto | null = null;
        if (showcase) {
          const isPrivate = showcase.privacyActivity === 'PRIVATE';
          const steamDisplayOff = showcase.connectedAccounts?.steam?.displayOnProfile === false;
          if (!isPrivate && !steamDisplayOff) {
            activityStatus = showcase.activityStatus ?? null;
          }
        }
        return toUserProfileDto(r.user, true, true, activityStatus);
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

      // Emit asynchronous notification event to the followed user
      if (followerId !== followingId) {
        if (this.eventEmitter) {
          this.eventEmitter.emit(
            NOTIFICATION_EVENTS.CREATE,
            new CreateNotificationEvent(followingId, NotificationType.FOLLOW, {
              actorId: followerId,
            }),
          );
        }
        if (this.gateway) {
          try {
            const follower = await this.followersRepository.findUserBasic(followerId);
            if (follower) {
              this.gateway?.emitToUser(followingId, WS_EVENTS.NEW_FOLLOWER, {
                follower: {
                  id: follower.id,
                  username: follower.username,
                  displayName: follower.displayName || follower.username,
                  avatar: follower.avatar,
                },
                status,
                message:
                  status === FollowStatus.PENDING
                    ? 'sent you a follow request'
                    : 'subscribed to you',
              });
            }
          } catch (e) {
            this.logger.warn(`Failed to emit real-time follower notification: ${String(e)}`);
          }
        }
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
      const owner = await this.followersRepository.findUserBasic(ownerId);
      if (owner) {
        this.gateway?.emitToUser(followerId, WS_EVENTS.NEW_FOLLOWER, {
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
    } catch (e) {
      this.logger.warn(
        `Failed to emit follow request accepted notification to ${followerId}: ${String(e)}`,
      );
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
    try {
      await Promise.all([
        this.redis.delByPattern(`followers:${followingId}:*`),
        this.redis.delByPattern(`following:${followerId}:*`),
        this.redis.del(`friends:${followerId}`),
        this.redis.del(`friends:${followingId}`),
        this.redis.del(`user:${followerId}`),
        this.redis.del(`user:${followingId}`),
        this.redis.del(`user${followerId}`),
        this.redis.del(`user${followingId}`),
      ]);
    } catch (e) {
      this.logger.warn(
        `Failed to invalidate follow caches for ${followerId} and ${followingId}: ${String(e)}`,
      );
    }
  }
}
