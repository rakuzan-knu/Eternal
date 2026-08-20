import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import {
  CreateNotificationParams,
  INotificationsRepository,
} from '../interfaces/notifications-repository.interface';
import { NotificationType, type NotificationWithRelations } from '@common/contracts';

interface ExtendedPrismaService extends PrismaService {
  notification: any;
  userNotificationSettings: any;
}

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
};

@Injectable()
export class NotificationsRepository implements INotificationsRepository {
  private readonly db: ExtendedPrismaService;

  constructor(prisma: PrismaService) {
    this.db = prisma;
  }

  async create(data: CreateNotificationParams): Promise<NotificationWithRelations> {
    return await this.db.notification.create({
      data: {
        userId: data.userId,
        actorId: data.actorId,
        type: data.type,
        postId: data.postId,
        commentId: data.commentId,
        text: data.text,
        extraCount: data.extraCount ?? 0,
      },
      include: NOTIFICATION_INCLUDE,
    });
  }

  async findRecentMatching(params: {
    userId: string;
    type: NotificationType;
    postId?: string | null;
    commentId?: string | null;
    withinSeconds?: number;
  }): Promise<NotificationWithRelations | null> {
    const seconds = params.withinSeconds ?? 86400; // Default 24h grouping window
    const since = new Date(Date.now() - seconds * 1000);

    const where: any = {
      userId: params.userId,
      type: params.type,
      createdAt: { gte: since },
    };

    if (params.postId !== undefined) where.postId = params.postId;
    if (params.commentId !== undefined) where.commentId = params.commentId;

    return await this.db.notification.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      include: NOTIFICATION_INCLUDE,
    });
  }

  async update(id: string, data: Record<string, any>): Promise<NotificationWithRelations> {
    return await this.db.notification.update({
      where: { id },
      data,
      include: NOTIFICATION_INCLUDE,
    });
  }

  async findById(id: string): Promise<NotificationWithRelations | null> {
    return await this.db.notification.findUnique({
      where: { id },
      include: NOTIFICATION_INCLUDE,
    });
  }

  async findMany(params: {
    userId: string;
    types?: NotificationType[];
    limit: number;
    cursor?: string;
  }): Promise<NotificationWithRelations[]> {
    const where: any = {
      userId: params.userId,
      ...(params.types && params.types.length > 0 ? { type: { in: params.types } } : {}),
    };

    return await this.db.notification.findMany({
      where,
      take: params.limit + 1,
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: NOTIFICATION_INCLUDE,
    });
  }

  async markAsRead(id: string, userId: string): Promise<NotificationWithRelations | null> {
    const notif = await this.db.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) return null;

    return await this.db.notification.update({
      where: { id },
      data: { isRead: true },
      include: NOTIFICATION_INCLUDE,
    });
  }

  async markAllAsRead(userId: string, types?: NotificationType[]): Promise<number> {
    const where: any = {
      userId,
      isRead: false,
      ...(types && types.length > 0 ? { type: { in: types } } : {}),
    };

    const res = await this.db.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return res.count;
  }

  async countUnread(userId: string): Promise<number> {
    return await this.db.notification.count({
      where: { userId, isRead: false },
    });
  }

  async countUnreadByCategory(userId: string): Promise<{
    likes: number;
    comments: number;
    follows: number;
    mentions: number;
    reposts: number;
    system: number;
  }> {
    const [likes, comments, follows, mentions, reposts, system] = await Promise.all([
      this.db.notification.count({
        where: {
          userId,
          isRead: false,
          type: { in: [NotificationType.LIKE_POST, NotificationType.LIKE_COMMENT] },
        },
      }),
      this.db.notification.count({
        where: {
          userId,
          isRead: false,
          type: NotificationType.COMMENT,
        },
      }),
      this.db.notification.count({
        where: {
          userId,
          isRead: false,
          type: NotificationType.FOLLOW,
        },
      }),
      this.db.notification.count({
        where: {
          userId,
          isRead: false,
          type: NotificationType.MENTION,
        },
      }),
      this.db.notification.count({
        where: {
          userId,
          isRead: false,
          type: NotificationType.REPOST,
        },
      }),
      this.db.notification.count({
        where: {
          userId,
          isRead: false,
          type: {
            in: [
              NotificationType.SYSTEM_VERIFIED,
              NotificationType.SYSTEM_VIEW,
              NotificationType.SYSTEM,
            ],
          },
        },
      }),
    ]);

    return {
      likes,
      comments,
      follows,
      mentions,
      reposts,
      system,
    };
  }

  async delete(id: string, userId?: string): Promise<boolean> {
    try {
      const existing = await this.db.notification.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!existing) return false;
      if (userId && existing.userId !== userId) return false;

      await this.db.notification.delete({ where: { id } });
      return true;
    } catch {
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
    const users = await this.db.user.findMany({
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

  async getSettings(userId: string): Promise<Record<string, any> | null> {
    return await this.db.userNotificationSettings.findUnique({
      where: { userId },
    });
  }

  async upsertSettings(userId: string, data: Record<string, any>): Promise<Record<string, any>> {
    const createData = {
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
      mutedActorIds: Array.isArray(data.mutedActorIds) ? (data.mutedActorIds as string[]) : [],
    };

    return await this.db.userNotificationSettings.upsert({
      where: { userId },
      create: createData,
      update: data,
    });
  }
}
