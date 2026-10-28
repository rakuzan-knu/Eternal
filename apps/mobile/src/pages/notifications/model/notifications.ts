import type { InfiniteData } from '@tanstack/react-query';
import type {
  NotificationFilterType,
  NotificationResponseDto,
  NotificationType,
  NotificationUnreadCountsDto,
  PaginatedNotificationsResponseDto,
} from '@social-network/shared-contracts';
import { type MessageKey, msg } from '@/shared/lib/i18n';

export const notificationFilters: {
  type: NotificationFilterType;
  label: MessageKey;
  count: keyof NotificationUnreadCountsDto;
}[] = [
  { type: 'all', label: msg('All'), count: 'total' },
  { type: 'likes', label: msg('Likes'), count: 'likes' },
  { type: 'comments', label: msg('Comments'), count: 'comments' },
  { type: 'follows', label: msg('Follows'), count: 'follows' },
  { type: 'mentions', label: msg('Mentions'), count: 'mentions' },
  { type: 'reposts', label: msg('Reposts'), count: 'reposts' },
  { type: 'system', label: msg('System'), count: 'system' },
];
const typesByFilter: Record<Exclude<NotificationFilterType, 'all'>, readonly NotificationType[]> = {
  likes: ['LIKE_POST', 'LIKE_COMMENT'],
  comments: ['COMMENT'],
  follows: ['FOLLOW'],
  mentions: ['MENTION'],
  reposts: ['REPOST'],
  system: ['SYSTEM', 'SYSTEM_VIEW', 'SYSTEM_VERIFIED'],
};
export type NotificationsData = InfiniteData<PaginatedNotificationsResponseDto>;
export type NotificationChange =
  | { kind: 'read'; item: NotificationResponseDto }
  | { kind: 'readAll'; filter: NotificationFilterType; unreadCounts: NotificationUnreadCountsDto }
  | { kind: 'delete'; id: string; unreadCounts: NotificationUnreadCountsDto };

export function updateNotifications(
  data: NotificationsData | undefined,
  change: NotificationChange,
) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      unreadCounts: 'unreadCounts' in change ? change.unreadCounts : page.unreadCounts,
      items:
        change.kind === 'delete'
          ? page.items.filter((item) => item.id !== change.id)
          : page.items.map((item) =>
              change.kind === 'read'
                ? item.id === change.item.id
                  ? change.item
                  : item
                : change.filter === 'all' || typesByFilter[change.filter].includes(item.type)
                  ? { ...item, isRead: true }
                  : item,
            ),
    })),
  };
}

export function uniqueNotifications(data: NotificationsData | undefined) {
  const seen = new Set<string>();
  return (
    data?.pages
      .flatMap((page) => page.items)
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }) ?? []
  );
}

export function notificationCursor(
  page: PaginatedNotificationsResponseDto,
  seen: (string | undefined)[],
) {
  return page.hasMore && page.nextCursor && !seen.includes(page.nextCursor)
    ? page.nextCursor
    : undefined;
}

export function notificationTarget(
  item: NotificationResponseDto,
  username: string,
):
  | { kind: 'post'; id: string; commentId: string | null }
  | { kind: 'web'; path: string }
  | { kind: 'profile'; username: string }
  | { kind: 'none' } {
  if (item.story) {
    // Only accept the server's local story route, never an external or executable deep link.
    if (item.deepLink.startsWith('/profile/')) {
      const url = new URL(item.deepLink, 'https://eternal.invalid');
      if (
        url.origin === 'https://eternal.invalid' &&
        url.searchParams.get('story') === item.story.id
      )
        return { kind: 'web', path: `${url.pathname}${url.search}` };
    }
    if (item.actor?.username)
      return {
        kind: 'web',
        path: `/profile/${encodeURIComponent(item.actor.username)}?story=${encodeURIComponent(item.story.id)}`,
      };
    return { kind: 'none' };
  }
  const postId = item.postId || item.post?.id;
  if (postId) return { kind: 'post', id: postId, commentId: item.commentId };
  if (item.type === 'SYSTEM_VERIFIED') return { kind: 'profile', username };
  if (item.actor?.username) return { kind: 'profile', username: item.actor.username };
  return { kind: 'none' };
}
