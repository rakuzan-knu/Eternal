import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NOTIFICATIONS_REPOSITORY } from './interfaces/notifications-repository.interface';
import type { INotificationsRepository } from './interfaces/notifications-repository.interface';
import type { Prisma } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { safeJsonParse } from '../common/utils/json.util';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { WS_EVENTS } from '../messenger/events/ws-events';
import {
  GetNotificationsQueryDto,
  NotificationFilterType,
  NotificationResponseDto,
  NotificationSettingsDto,
  NotificationType,
  NotificationUnreadCountsDto,
  PaginatedNotificationsResponseDto,
  UpdateNotificationSettingsDto,
} from '@common/contracts';
import { makeNotificationUnreadCounts } from '../common/v8/shape-stable';
import { CreateNotificationEvent, NOTIFICATION_EVENTS } from './events/notification.events';
import { QueueService } from '../queue/queue.service';
import { NotificationJobType } from '../queue/queue.constants';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly repo: INotificationsRepository,
    @Optional() private readonly redis?: RedisService,
    @Optional() private readonly queueService?: QueueService,
    @Inject(forwardRef(() => MessengerGateway))
    @Optional()
    private readonly gateway?: MessengerGateway,
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.CREATE, { async: true })
  async handleNotificationCreated(event: CreateNotificationEvent): Promise<void> {
    try {
      await this.createNotification(event.userId, event.type, event.payload);
    } catch (err) {
      this.logger.error(
        `Failed to process notification event: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    opts: {
      actorId?: string | null;
      postId?: string | null;
      commentId?: string | null;
      text?: string | null;
      allowGrouping?: boolean;
    } = {},
  ): Promise<NotificationResponseDto | null> {
    const actorId = opts.actorId ?? null;

    // 1. Never notify oneself
    if (actorId && actorId === userId) {
      return null;
    }

    // 2. Blocklist Check: if either user has blocked the other, suppress notification
    if (actorId) {
      const isBlocked = await this.repo.isBlocked(userId, actorId);
      if (isBlocked) {
        return null;
      }
    }

    // 3. Spam Protection & Debounce (via Redis if available)
    if (actorId && this.redis) {
      const lockKey = `notif_debounce:${actorId}:${userId}:${type}:${opts.postId || 'none'}:${opts.commentId || 'none'}`;
      try {
        const acquired = await this.redis.acquireLock(lockKey, 3000);
        if (!acquired) {
          return null; // Ignore spam burst
        }
      } catch (e) {
        this.logger.warn(`Notification debounce lock Redis fallback: ${String(e)}`);
      }
    }

    const allowGrouping =
      opts.allowGrouping ??
      (type === NotificationType.LIKE_POST ||
        type === NotificationType.LIKE_COMMENT ||
        type === NotificationType.FOLLOW ||
        type === NotificationType.REPOST);

    let notificationRecord;

    // 4. Smart Grouping / Aggregation
    if (allowGrouping && actorId) {
      const existing = await this.repo.findRecentMatching({
        userId,
        type,
        postId: opts.postId,
        commentId: opts.commentId,
        withinSeconds: 86400 * 2, // 48h grouping window
      });

      if (existing && existing.actorId !== actorId) {
        // Increment extraCount and update actor to latest actor
        notificationRecord = await this.repo.update(existing.id, {
          actor: { connect: { id: actorId } },
          extraCount: { increment: 1 },
          isRead: false,
          updatedAt: new Date(),
        });
      }
    }

    // If not grouped, create a brand new notification
    if (!notificationRecord) {
      notificationRecord = await this.repo.create({
        userId,
        actorId,
        type,
        postId: opts.postId ?? null,
        commentId: opts.commentId ?? null,
        text: opts.text ?? null,
      });
    }

    const dto = NotificationResponseDto.fromPrisma(notificationRecord);

    // 5. Backend Preference Guard & Real-time WebSocket Broadcast
    // Check if recipient enabled notifications for this category
    const isPushAllowed = await this.isNotificationPushAllowed(userId, type, actorId);

    if (this.gateway && isPushAllowed) {
      try {
        const categoryCounts = await this.repo.countUnreadByCategory(userId);
        const total = await this.repo.countUnread(userId);
        const unreadCounts = makeNotificationUnreadCounts(
          total,
          categoryCounts.likes,
          categoryCounts.comments,
          categoryCounts.follows,
          categoryCounts.mentions,
          categoryCounts.reposts,
          categoryCounts.system,
        );

        this.gateway.emitToUser(userId, WS_EVENTS.NOTIFICATION_NEW, {
          notification: dto,
          unreadCounts,
        });
      } catch (err) {
        this.logger.warn(`Failed to emit socket notification: ${(err as Error).message}`);
      }
    }

    if (this.queueService) {
      void this.queueService
        .addNotificationJob(NotificationJobType.PUSH, {
          userId,
          type,
          payload: opts,
        })
        .catch(() => {});
    }

    return dto;
  }

  async getNotifications(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    try {
      const limit = query.limit || 20;
      const types = this.mapFilterToTypes(query.type);

      const rows = await this.repo.findMany({
        userId,
        types,
        limit,
        cursor: query.cursor,
      });

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

      const [categoryCounts, totalUnread] = await Promise.all([
        this.repo.countUnreadByCategory(userId),
        this.repo.countUnread(userId),
      ]);

      return {
        items: items.map((r) => NotificationResponseDto.fromPrisma(r)),
        nextCursor,
        hasMore,
        unreadCounts: {
          total: totalUnread,
          ...categoryCounts,
        },
      };
    } catch (err) {
      this.logger.error(`Failed to get notifications: ${(err as Error).message}`);
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
        unreadCounts: {
          total: 0,
          likes: 0,
          comments: 0,
          follows: 0,
          mentions: 0,
          reposts: 0,
          system: 0,
        },
      };
    }
  }

  async markAsRead(id: string, userId: string): Promise<NotificationResponseDto> {
    const updated = await this.repo.markAsRead(id, userId);
    if (!updated) {
      throw new NotFoundException('Notification not found or unauthorized');
    }

    const dto = NotificationResponseDto.fromPrisma(updated);

    if (this.gateway) {
      try {
        const categoryCounts = await this.repo.countUnreadByCategory(userId);
        const total = await this.repo.countUnread(userId);
        const unreadCounts = makeNotificationUnreadCounts(
          total,
          categoryCounts.likes,
          categoryCounts.comments,
          categoryCounts.follows,
          categoryCounts.mentions,
          categoryCounts.reposts,
          categoryCounts.system,
        );

        this.gateway.emitToUser(userId, WS_EVENTS.NOTIFICATION_READ, {
          notificationId: id,
          allRead: false,
          unreadCounts,
        });
      } catch (err) {
        this.logger.warn(`Failed to emit socket read: ${(err as Error).message}`);
      }
    }

    return dto;
  }

  async markAllAsRead(
    userId: string,
    filter?: NotificationFilterType,
  ): Promise<{ success: boolean; count: number; unreadCounts: NotificationUnreadCountsDto }> {
    const types = filter ? this.mapFilterToTypes(filter) : undefined;
    const count = await this.repo.markAllAsRead(userId, types);

    const [categoryCounts, total] = await Promise.all([
      this.repo.countUnreadByCategory(userId),
      this.repo.countUnread(userId),
    ]);

    const unreadCounts = makeNotificationUnreadCounts(
      total,
      categoryCounts.likes,
      categoryCounts.comments,
      categoryCounts.follows,
      categoryCounts.mentions,
      categoryCounts.reposts,
      categoryCounts.system,
    );

    if (this.gateway) {
      try {
        this.gateway.emitToUser(userId, WS_EVENTS.NOTIFICATION_READ, {
          allRead: true,
          filterType: filter,
          unreadCounts,
        });
      } catch (err) {
        this.logger.warn(`Failed to emit socket all read: ${(err as Error).message}`);
      }
    }

    return {
      success: true,
      count,
      unreadCounts,
    };
  }

  async deleteNotification(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; unreadCounts: NotificationUnreadCountsDto }> {
    const deleted = await this.repo.delete(id, userId);
    if (!deleted) {
      throw new NotFoundException('Notification not found or unauthorized');
    }

    const [categoryCounts, total] = await Promise.all([
      this.repo.countUnreadByCategory(userId),
      this.repo.countUnread(userId),
    ]);

    const unreadCounts = makeNotificationUnreadCounts(
      total,
      categoryCounts.likes,
      categoryCounts.comments,
      categoryCounts.follows,
      categoryCounts.mentions,
      categoryCounts.reposts,
      categoryCounts.system,
    );

    if (this.gateway) {
      try {
        this.gateway.emitToUser(userId, WS_EVENTS.NOTIFICATION_READ, {
          notificationId: id,
          deleted: true,
          unreadCounts,
        });
      } catch (err) {
        this.logger.warn(`Failed to emit socket delete: ${(err as Error).message}`);
      }
    }

    return {
      success: true,
      unreadCounts,
    };
  }

  async getUnreadCounts(userId: string): Promise<NotificationUnreadCountsDto> {
    try {
      const [categoryCounts, total] = await Promise.all([
        this.repo.countUnreadByCategory(userId),
        this.repo.countUnread(userId),
      ]);

      return makeNotificationUnreadCounts(
        total,
        categoryCounts.likes,
        categoryCounts.comments,
        categoryCounts.follows,
        categoryCounts.mentions,
        categoryCounts.reposts,
        categoryCounts.system,
      );
    } catch (err) {
      this.logger.error(`Failed to get unread counts: ${(err as Error).message}`);
      return makeNotificationUnreadCounts(0, 0, 0, 0, 0, 0, 0);
    }
  }

  async getSettings(userId: string): Promise<NotificationSettingsDto> {
    const cacheKey = `user:notif_settings:${userId}`;
    let cachedDto: NotificationSettingsDto | null = null;
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) cachedDto = safeJsonParse<NotificationSettingsDto>(cached);
      } catch (e) {
        this.logger.warn(
          `Failed to parse notification settings from Redis for ${userId}: ${String(e)}`,
        );
      }
    }

    let result: NotificationSettingsDto;
    if (cachedDto) {
      result = cachedDto;
    } else {
      const row = await this.repo.getSettings(userId);
      const defaults: NotificationSettingsDto = {
        enableNotifications: true,
        allowSound: true,
        volume: 100,
        showName: true,
        showText: true,
        privateChats: true,
        groups: true,
        reactions: true,
        likes: true,
        comments: true,
        reposts: true,
        followers: true,
        mentions: true,
        system: true,
        toastPosition: 'bottom-right',
        maxToasts: 3,
        dndUntil: null,
        mutedActorIds: [],
      };

      result = row
        ? {
            enableNotifications: row.enableNotifications,
            allowSound: row.allowSound,
            volume: row.volume,
            showName: row.showName,
            showText: row.showText,
            privateChats: row.privateChats,
            groups: row.groups,
            reactions: row.reactions,
            likes: row.likes,
            comments: row.comments,
            reposts: row.reposts,
            followers: row.followers,
            mentions: row.mentions,
            system: row.system,
            toastPosition: row.toastPosition as NotificationSettingsDto['toastPosition'],
            maxToasts: row.maxToasts,
            dndUntil: row.dndUntil ? row.dndUntil.toISOString() : null,
            mutedActorIds: row.mutedActorIds || [],
          }
        : defaults;

      if (this.redis) {
        try {
          await this.redis.set(cacheKey, JSON.stringify(result), 300);
        } catch (e) {
          this.logger.warn(
            `Failed to write notification settings to Redis for ${userId}: ${String(e)}`,
          );
        }
      }
    }

    // Enrich with muted actors metadata
    if (result.mutedActorIds && result.mutedActorIds.length > 0) {
      try {
        const users = await this.repo.getUsersByIds(result.mutedActorIds);
        result.mutedActors = users.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName || u.username,
          avatar: u.avatar ?? null,
          isVerified: Boolean(u.isVerified),
          primaryBadge: u.primaryBadge ?? null,
        }));
      } catch (e) {
        this.logger.warn(`Failed to enrich muted actors for ${userId}: ${String(e)}`);
        result.mutedActors = [];
      }
    } else {
      result.mutedActors = [];
    }

    return result;
  }

  async updateSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsDto> {
    const prismaUpdateData: Prisma.UserNotificationSettingsUpdateInput = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined && key !== 'dndUntil') {
        (prismaUpdateData as Record<string, unknown>)[key] = value;
      }
    }
    if (dto.dndUntil !== undefined) {
      prismaUpdateData.dndUntil = dto.dndUntil ? new Date(dto.dndUntil) : null;
    }

    const updated = await this.repo.upsertSettings(userId, prismaUpdateData);
    const result: NotificationSettingsDto = {
      enableNotifications: updated.enableNotifications,
      allowSound: updated.allowSound,
      volume: updated.volume,
      showName: updated.showName,
      showText: updated.showText,
      privateChats: updated.privateChats,
      groups: updated.groups,
      reactions: updated.reactions,
      likes: updated.likes,
      comments: updated.comments,
      reposts: updated.reposts,
      followers: updated.followers,
      mentions: updated.mentions,
      system: updated.system,
      toastPosition: updated.toastPosition as NotificationSettingsDto['toastPosition'],
      maxToasts: updated.maxToasts,
      dndUntil: updated.dndUntil ? updated.dndUntil.toISOString() : null,
      mutedActorIds: updated.mutedActorIds || [],
    };

    const cacheKey = `user:notif_settings:${userId}`;
    if (this.redis) {
      try {
        await this.redis.set(cacheKey, JSON.stringify(result), 300);
      } catch (e) {
        this.logger.warn(
          `Failed to update notification settings cache for ${userId}: ${String(e)}`,
        );
      }
    }

    if (result.mutedActorIds && result.mutedActorIds.length > 0) {
      try {
        const users = await this.repo.getUsersByIds(result.mutedActorIds);
        result.mutedActors = users.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName || u.username,
          avatar: u.avatar ?? null,
          isVerified: Boolean(u.isVerified),
          primaryBadge: u.primaryBadge ?? null,
        }));
      } catch (e) {
        this.logger.warn(
          `Failed to enrich muted actors in updateSettings for ${userId}: ${String(e)}`,
        );
        result.mutedActors = [];
      }
    } else {
      result.mutedActors = [];
    }

    return result;
  }

  async muteAuthor(userId: string, actorId: string): Promise<NotificationSettingsDto> {
    const current = await this.getSettings(userId);
    const mutedSet = new Set(current.mutedActorIds || []);
    mutedSet.add(actorId);
    return this.updateSettings(userId, { mutedActorIds: Array.from(mutedSet) });
  }

  async unmuteAuthor(userId: string, actorId: string): Promise<NotificationSettingsDto> {
    const current = await this.getSettings(userId);
    const mutedSet = new Set(current.mutedActorIds || []);
    mutedSet.delete(actorId);
    return this.updateSettings(userId, { mutedActorIds: Array.from(mutedSet) });
  }

  async isNotificationPushAllowed(
    userId: string,
    type: NotificationType,
    actorId?: string | null,
  ): Promise<boolean> {
    try {
      const settings = await this.getSettings(userId);
      if (!settings.enableNotifications) return false;

      // Check Do Not Disturb (DND)
      if (settings.dndUntil) {
        const dndDate = new Date(settings.dndUntil);
        if (dndDate.getTime() > Date.now()) {
          return false;
        }
      }

      // Check Muted Authors
      if (actorId && settings.mutedActorIds && settings.mutedActorIds.includes(actorId)) {
        return false;
      }

      switch (type) {
        case NotificationType.LIKE_POST:
        case NotificationType.LIKE_COMMENT:
          return settings.likes;
        case NotificationType.COMMENT:
          return settings.comments;
        case NotificationType.REPOST:
          return settings.reposts;
        case NotificationType.FOLLOW:
          return settings.followers;
        case NotificationType.MENTION:
          return settings.mentions;
        case NotificationType.SYSTEM_VERIFIED:
        case NotificationType.SYSTEM_VIEW:
        case NotificationType.SYSTEM:
          return settings.system;
        default:
          return true;
      }
    } catch (e) {
      this.logger.warn(`Failed to check push allowed for user ${userId}: ${String(e)}`);
      return true;
    }
  }

  private mapFilterToTypes(filter: NotificationFilterType): NotificationType[] | undefined {
    switch (filter) {
      case 'likes':
        return [NotificationType.LIKE_POST, NotificationType.LIKE_COMMENT];
      case 'comments':
        return [NotificationType.COMMENT];
      case 'follows':
        return [NotificationType.FOLLOW];
      case 'mentions':
        return [NotificationType.MENTION];
      case 'reposts':
        return [NotificationType.REPOST];
      case 'system':
        return [
          NotificationType.SYSTEM_VERIFIED,
          NotificationType.SYSTEM_VIEW,
          NotificationType.SYSTEM,
        ];
      case 'all':
      default:
        return undefined;
    }
  }
}
