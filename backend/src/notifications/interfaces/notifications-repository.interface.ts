import type { NotificationType, NotificationWithRelations } from '@common/contracts';

export const NOTIFICATIONS_REPOSITORY = Symbol('NOTIFICATIONS_REPOSITORY');

export interface CreateNotificationParams {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  text?: string | null;
  extraCount?: number;
}

export interface INotificationsRepository {
  create(data: CreateNotificationParams): Promise<NotificationWithRelations>;
  findRecentMatching(params: {
    userId: string;
    type: NotificationType;
    postId?: string | null;
    commentId?: string | null;
    withinSeconds?: number;
  }): Promise<NotificationWithRelations | null>;
  update(id: string, data: Record<string, any>): Promise<NotificationWithRelations>;
  findById(id: string): Promise<NotificationWithRelations | null>;
  findMany(params: {
    userId: string;
    types?: NotificationType[];
    limit: number;
    cursor?: string;
  }): Promise<NotificationWithRelations[]>;
  markAsRead(id: string, userId: string): Promise<NotificationWithRelations | null>;
  markAllAsRead(userId: string, types?: NotificationType[]): Promise<number>;
  countUnread(userId: string): Promise<number>;
  countUnreadByCategory(userId: string): Promise<{
    likes: number;
    comments: number;
    follows: number;
    mentions: number;
    reposts: number;
    system: number;
  }>;
  delete(id: string, userId?: string): Promise<boolean>;
  getUsersByIds(ids: string[]): Promise<
    Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatar: string | null;
      isVerified?: boolean;
      primaryBadge?: string | null;
    }>
  >;
  getSettings(userId: string): Promise<Record<string, any> | null>;
  upsertSettings(userId: string, data: Record<string, any>): Promise<Record<string, any>>;
}
