export type NotificationType =
  | 'LIKE_POST'
  | 'LIKE_COMMENT'
  | 'COMMENT'
  | 'FOLLOW'
  | 'REPOST'
  | 'MENTION'
  | 'SYSTEM_VERIFIED'
  | 'SYSTEM_VIEW'
  | 'SYSTEM';

export type NotificationFilter =
  'all' | 'likes' | 'comments' | 'follows' | 'mentions' | 'reposts' | 'system';

export interface NotificationActor {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isVerified?: boolean;
  primaryBadge?: string | null;
}

export interface NotificationPostPreview {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}

export interface NotificationCommentPreview {
  id: string;
  text: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId?: string | null;
  actor?: NotificationActor | null;
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  text?: string | null;
  extraCount: number;
  isRead: boolean;
  createdAt: string;
  post?: NotificationPostPreview | null;
  comment?: NotificationCommentPreview | null;
  actionText: string;
  deepLink?: string | null;
}

export interface NotificationUnreadCounts {
  total: number;
  likes: number;
  comments: number;
  follows: number;
  mentions: number;
  reposts: number;
  system: number;
}

export interface PaginatedNotificationsResponse {
  items: NotificationItem[];
  nextCursor: string | null;
  hasMore: boolean;
  unreadCounts: NotificationUnreadCounts;
}
