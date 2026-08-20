import { z } from 'zod';

export const NotificationTypeEnum = {
  LIKE_POST: 'LIKE_POST',
  LIKE_COMMENT: 'LIKE_COMMENT',
  COMMENT: 'COMMENT',
  FOLLOW: 'FOLLOW',
  REPOST: 'REPOST',
  MENTION: 'MENTION',
  SYSTEM_VERIFIED: 'SYSTEM_VERIFIED',
  SYSTEM_VIEW: 'SYSTEM_VIEW',
  SYSTEM: 'SYSTEM',
} as const;

export const NotificationType = NotificationTypeEnum;
export type NotificationType = (typeof NotificationTypeEnum)[keyof typeof NotificationTypeEnum];

export const NotificationFilterEnum = {
  ALL: 'all',
  LIKES: 'likes',
  COMMENTS: 'comments',
  FOLLOWS: 'follows',
  MENTIONS: 'mentions',
  REPOSTS: 'reposts',
  SYSTEM: 'system',
} as const;

export type NotificationFilterType =
  (typeof NotificationFilterEnum)[keyof typeof NotificationFilterEnum];

export const getNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  type: z
    .enum(['all', 'likes', 'comments', 'follows', 'mentions', 'reposts', 'system'])
    .default('all'),
});
export type GetNotificationsQueryDto = z.infer<typeof getNotificationsQuerySchema>;

export interface NotificationActorDto {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  isVerified?: boolean;
  primaryBadge?: string | null;
}

export interface NotificationPostPreviewDto {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}

export interface NotificationUnreadCountsDto {
  total: number;
  likes: number;
  comments: number;
  follows: number;
  mentions: number;
  reposts: number;
  system: number;
}

export type NotificationWithRelations = {
  id: string;
  userId: string;
  actorId: string | null;
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  text?: string | null;
  extraCount?: number;
  isRead: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
  actor?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    isVerified?: boolean;
    primaryBadge?: string | null;
  } | null;
  post?: {
    id: string;
    content: string;
    media?: { url: string; type?: string }[];
  } | null;
  comment?: {
    id: string;
    text: string;
  } | null;
};

function toSafeIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (
    typeof val === 'object' &&
    'toISOString' in val &&
    typeof (val as { toISOString: () => string }).toISOString === 'function'
  ) {
    return (val as { toISOString: () => string }).toISOString();
  }
  const parsed = new Date(val as string | number);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export class NotificationResponseDto {
  id!: string;
  userId!: string;
  actorId!: string | null;
  actor!: NotificationActorDto | null;
  type!: NotificationType;
  postId!: string | null;
  commentId!: string | null;
  text!: string | null;
  extraCount!: number;
  isRead!: boolean;
  createdAt!: string;
  post!: NotificationPostPreviewDto | null;
  actionText!: string;
  deepLink!: string;

  static fromPrisma(n: NotificationWithRelations): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = n.id;
    dto.userId = n.userId;
    dto.actorId = n.actorId ?? null;
    dto.type = n.type;
    dto.postId = n.postId ?? null;
    dto.commentId = n.commentId ?? null;
    dto.text = n.text ?? null;
    dto.extraCount = n.extraCount ?? 0;
    dto.isRead = Boolean(n.isRead);
    dto.createdAt = toSafeIsoString(n.createdAt);

    if (n.actor) {
      dto.actor = {
        id: n.actor.id,
        username: n.actor.username,
        displayName: n.actor.displayName || n.actor.username,
        avatar: n.actor.avatar ?? null,
        isVerified: Boolean(n.actor.isVerified),
        primaryBadge: n.actor.primaryBadge ?? null,
      };
    } else {
      dto.actor = null;
    }

    if (n.post) {
      const firstMedia = n.post.media && n.post.media.length > 0 ? n.post.media[0] : undefined;
      dto.post = {
        id: n.post.id,
        content: n.post.content,
        mediaUrl: firstMedia?.url ?? null,
        mediaType: firstMedia?.type ?? null,
      };
    } else {
      dto.post = null;
    }

    // Smart Action Text generation
    const actorName = dto.actor?.displayName || dto.actor?.username || 'Someone';
    const extra = dto.extraCount > 0 ? ` and ${dto.extraCount} others` : '';

    switch (dto.type) {
      case 'LIKE_POST':
        dto.actionText = `${actorName}${extra} liked your post`;
        dto.deepLink = dto.postId ? `/post/${dto.postId}` : '/notifications';
        break;
      case 'LIKE_COMMENT':
        dto.actionText = `${actorName}${extra} liked your comment`;
        dto.deepLink = dto.postId
          ? dto.commentId
            ? `/post/${dto.postId}?commentId=${dto.commentId}`
            : `/post/${dto.postId}`
          : '/notifications';
        break;
      case 'COMMENT':
        dto.actionText = dto.commentId
          ? `${actorName} commented on your post`
          : `${actorName} commented on your post`;
        dto.deepLink = dto.postId
          ? dto.commentId
            ? `/post/${dto.postId}?commentId=${dto.commentId}`
            : `/post/${dto.postId}`
          : '/notifications';
        break;
      case 'FOLLOW':
        dto.actionText = `${actorName}${extra} started following you`;
        dto.deepLink = dto.actor ? `/${dto.actor.username}` : '/notifications';
        break;
      case 'REPOST':
        dto.actionText = `${actorName}${extra} reposted your post`;
        dto.deepLink = dto.postId ? `/post/${dto.postId}` : '/notifications';
        break;
      case 'MENTION':
        dto.actionText = `${actorName} mentioned you in a ${dto.commentId ? 'comment' : 'post'}`;
        dto.deepLink = dto.postId
          ? dto.commentId
            ? `/post/${dto.postId}?commentId=${dto.commentId}`
            : `/post/${dto.postId}`
          : '/notifications';
        break;
      case 'SYSTEM_VERIFIED':
        dto.actionText = 'Your account has been verified';
        dto.deepLink = '/profile';
        break;
      case 'SYSTEM_VIEW':
        dto.actionText = dto.text || 'Your post reached new milestone';
        dto.deepLink = dto.postId ? `/post/${dto.postId}` : '/notifications';
        break;
      case 'SYSTEM':
      default:
        dto.actionText = dto.text || 'System notification';
        dto.deepLink = '/notifications';
        break;
    }

    return dto;
  }
}

export interface PaginatedNotificationsResponseDto {
  items: NotificationResponseDto[];
  nextCursor: string | null;
  hasMore: boolean;
  unreadCounts: NotificationUnreadCountsDto;
}

export const notificationSettingsSchema = z.object({
  enableNotifications: z.boolean().default(true),
  allowSound: z.boolean().default(true),
  volume: z.number().int().min(0).max(100).default(100),
  showName: z.boolean().default(true),
  showText: z.boolean().default(true),
  privateChats: z.boolean().default(true),
  groups: z.boolean().default(true),
  reactions: z.boolean().default(true),
  likes: z.boolean().default(true),
  comments: z.boolean().default(true),
  reposts: z.boolean().default(true),
  followers: z.boolean().default(true),
  mentions: z.boolean().default(true),
  system: z.boolean().default(true),
  toastPosition: z
    .enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
    .default('bottom-right'),
  maxToasts: z.number().int().min(1).max(5).default(3),
  dndUntil: z.string().nullable().optional(),
  mutedActorIds: z.array(z.string()).default([]),
});

export type NotificationSettingsDto = z.infer<typeof notificationSettingsSchema> & {
  mutedActors?: NotificationActorDto[];
};

export const updateNotificationSettingsSchema = notificationSettingsSchema.partial();
export type UpdateNotificationSettingsDto = z.infer<typeof updateNotificationSettingsSchema>;
