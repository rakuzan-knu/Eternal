import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import type { Prisma, UserNotificationSettings } from '@prisma/client';
import {
  type CreateNotificationParams,
  type INotificationsRepository,
} from '../interfaces/notifications-repository.interface';
import { NotificationType, type NotificationWithRelations } from '@common/contracts';

const NOTIFICATION_INCLUDE = {
  actor: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      isVerified: true,
      primaryBadge: true,
    },
  },
  post: {
    select: {
      id: true,
      content: true,
      media: {
        select: { url: true, type: true },
        take: 1,
        orderBy: { order: 'asc' as const },
      },
    },
  },
  comment: {
    select: {
      id: true,
      text: true,
    },
  },
} satisfies Prisma.NotificationInclude;

@Injectable()
export class NotificationsRepository implements INotificationsRepository {
  private readonly logger = new Logger(NotificationsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationParams): Promise<NotificationWithRelations> {
    const created = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        actorId: data.actorId ?? null,
        type: data.type,
        postId: data.postId ?? null,
        commentId: data.commentId ?? null,
        text: data.text ?? null,
        extraCount: data.extraCount ?? 0,
      },
      include: NOTIFICATION_INCLUDE,
    });
    return created;
  }

  async findRecentMatching(params: {
    userId: string;
    type: NotificationType;
    postId?: string | null | undefined;
    commentId?: string | null | undefined;
    withinSeconds?: number | undefined;
  }): Promise<NotificationWithRelations | null> {
    const seconds = params.withinSeconds ?? 86400; // Default 24h grouping window
    const since = new Date(Date.now() - seconds * 1000);

    const where: Prisma.NotificationWhereInput = {
      userId: params.userId,
      type: params.type,
      createdAt: { gte: since },
    };

    if (params.postId !== undefined) where.postId = params.postId;
    if (params.commentId !== undefined) where.commentId = params.commentId;

    const found = await this.prisma.notification.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      include: NOTIFICATION_INCLUDE,
    });
    return found;
  }

  async update(
    id: string,
    data: Prisma.NotificationUpdateInput,
  ): Promise<NotificationWithRelations> {
    const updated = await this.prisma.notification.update({
      where: { id },
      data,
      include: NOTIFICATION_INCLUDE,
    });
    return updated;
  }

  async findById(id: string): Promise<NotificationWithRelations | null> {
    const found = await this.prisma.notification.findUnique({
      where: { id },
      include: NOTIFICATION_INCLUDE,
    });
    return found;
  }

  async findMany(params: {
    userId: string;
    types?: NotificationType[];
    limit: number;
    cursor?: string;
  }): Promise<NotificationWithRelations[]> {
    try {
      const where: Prisma.NotificationWhereInput = {
        userId: params.userId,
        ...(params.types && params.types.length > 0 ? { type: { in: params.types } } : {}),
      };

      const items = await this.prisma.notification.findMany({
        where,
        take: params.limit + 1,
        skip: params.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        ...(params.cursor ? { cursor: { id: params.cursor } } : {}),
        include: NOTIFICATION_INCLUDE,
      });
      return items;
    } catch (e) {
      this.logger.warn(`Failed to find notifications for user ${params.userId}: ${String(e)}`);
      return [];
    }
  }

  async markAsRead(id: string, userId: string): Promise<NotificationWithRelations | null> {
    try {
      const notif = await this.prisma.notification.findUnique({ where: { id } });
      if (!notif || notif.userId !== userId) return null;

      const updated = await this.prisma.notification.update({
        where: { id },
        data: { isRead: true },
        include: NOTIFICATION_INCLUDE,
      });
      return updated;
    } catch (e) {
      this.logger.warn(`Failed to mark notification ${id} as read: ${String(e)}`);
      return null;
    }
  }

  async markAllAsRead(userId: string, types?: NotificationType[]): Promise<number> {
    try {
      const where: Prisma.NotificationWhereInput = {
        userId,
        isRead: false,
        ...(types && types.length > 0 ? { type: { in: types } } : {}),
      };

      const res = await this.prisma.notification.updateMany({
        where,
        data: { isRead: true },
      });

      return res.count;
    } catch (e) {
      this.logger.warn(`Failed to mark all notifications as read for user ${userId}: ${String(e)}`);
      return 0;
    }
  }

  async countUnread(userId: string): Promise<number> {
    try {
      return await this.prisma.notification.count({
        where: { userId, isRead: false },
      });
    } catch (e) {
      this.logger.warn(`Failed to count unread notifications for user ${userId}: ${String(e)}`);
      return 0;
    }
  }

  async countUnreadByCategory(userId: string): Promise<{
    likes: number;
    comments: number;
    follows: number;
    mentions: number;
    reposts: number;
    system: number;
  }> {
    try {
      const grouped = await this.prisma.notification.groupBy({
        by: ['type'],
        where: {
          userId,
          isRead: false,
        },
        _count: {
          _all: true,
        },
      });

      const map = new Map<string, number>();
      for (const item of grouped) {
        map.set(item.type, item._count._all);
      }

      const likes =
        (map.get(NotificationType.LIKE_POST) || 0) + (map.get(NotificationType.LIKE_COMMENT) || 0);
      const comments = map.get(NotificationType.COMMENT) || 0;
      const follows = map.get(NotificationType.FOLLOW) || 0;
      const mentions = map.get(NotificationType.MENTION) || 0;
      const reposts = map.get(NotificationType.REPOST) || 0;
      const system =
        (map.get(NotificationType.SYSTEM_VERIFIED) || 0) +
        (map.get(NotificationType.SYSTEM_VIEW) || 0) +
        (map.get(NotificationType.SYSTEM) || 0);

      return {
        likes,
        comments,
        follows,
        mentions,
        reposts,
        system,
      };
    } catch (e) {
      this.logger.warn(
        `Failed to count unread notifications by category for user ${userId}: ${String(e)}`,
      );
      return {
        likes: 0,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      };
    }
  }

  async delete(id: string, userId?: string): Promise<boolean> {
    try {
      const existing = await this.prisma.notification.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!existing) return false;
      if (userId && existing.userId !== userId) return false;

      await this.prisma.notification.delete({ where: { id } });
      return true;
    } catch (e) {
      this.logger.warn(`Failed to delete notification ${id}: ${String(e)}`);
      return false;
    }
  }

  async getUsersByIds(ids: string[]): Promise<
    Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatar: string | null;
      isVerified?: boolean;
      primaryBadge?: string | null;
    }>
  > {
    if (!ids || ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        isVerified: true,
        primaryBadge: true,
      },
    });
    return users;
  }

  async getSettings(userId: string): Promise<UserNotificationSettings | null> {
    return await this.prisma.userNotificationSettings.findUnique({
      where: { userId },
    });
  }

  async upsertSettings(
    userId: string,
    data: Prisma.UserNotificationSettingsUpdateInput,
  ): Promise<UserNotificationSettings> {
    const createData: Prisma.UserNotificationSettingsCreateInput = {
      user: { connect: { id: userId } },
      enableNotifications:
        typeof data.enableNotifications === 'boolean' ? data.enableNotifications : true,
      allowSound: typeof data.allowSound === 'boolean' ? data.allowSound : true,
      volume: typeof data.volume === 'number' ? data.volume : 100,
      showName: typeof data.showName === 'boolean' ? data.showName : true,
      showText: typeof data.showText === 'boolean' ? data.showText : true,
      privateChats: typeof data.privateChats === 'boolean' ? data.privateChats : true,
      groups: typeof data.groups === 'boolean' ? data.groups : true,
      reactions: typeof data.reactions === 'boolean' ? data.reactions : true,
      likes: typeof data.likes === 'boolean' ? data.likes : true,
      comments: typeof data.comments === 'boolean' ? data.comments : true,
      reposts: typeof data.reposts === 'boolean' ? data.reposts : true,
      followers: typeof data.followers === 'boolean' ? data.followers : true,
      mentions: typeof data.mentions === 'boolean' ? data.mentions : true,
      system: typeof data.system === 'boolean' ? data.system : true,
      toastPosition: typeof data.toastPosition === 'string' ? data.toastPosition : 'bottom-right',
      maxToasts: typeof data.maxToasts === 'number' ? data.maxToasts : 3,
      dndUntil: (data.dndUntil as Date | null) ?? null,
      mutedActorIds: Array.isArray(data.mutedActorIds) ? data.mutedActorIds : [],
    };

    return await this.prisma.userNotificationSettings.upsert({
      where: { userId },
      create: createData,
      update: data,
    });
  }

  async isBlocked(userId: string, actorId: string): Promise<boolean> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: actorId },
          { blockerId: actorId, blockedId: userId },
        ],
      },
      select: { blockerId: true },
    });
    return block !== null;
  }
}
