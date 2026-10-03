import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationFilterType } from '@social-network/shared-contracts';
import { useAuthStore } from '@social-network/shared-stores';
import { assertSession } from '@/shared/api/client';
import { notificationsApi } from '../api/notificationsApi';
import {
  notificationCursor,
  updateNotifications,
  type NotificationChange,
  type NotificationsData,
} from './notifications';

export const notificationsKeys = {
  root: (userId: string) => ['mobile', userId, 'notifications'] as const,
  lists: (userId: string) => [...notificationsKeys.root(userId), 'list'] as const,
  list: (userId: string, filter: NotificationFilterType) =>
    [...notificationsKeys.lists(userId), filter] as const,
  unread: (userId: string) => [...notificationsKeys.root(userId), 'unread'] as const,
};

export function useUnreadNotifications(userId: string) {
  return useQuery({
    queryKey: notificationsKeys.unread(userId),
    queryFn: ({ signal }) => notificationsApi.unread(signal),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
export function useNotifications(userId: string, filter: NotificationFilterType) {
  return useInfiniteQuery({
    queryKey: notificationsKeys.list(userId, filter),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => notificationsApi.list(filter, pageParam, signal),
    getNextPageParam: (page, _pages, _param, params) => notificationCursor(page, params),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

type NotificationAction =
  | { kind: 'read'; id: string }
  | { kind: 'delete'; id: string }
  | { kind: 'readAll'; filter: NotificationFilterType };
export function useNotificationActions(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: notificationsKeys.root(userId),
    onMutate: () => client.cancelQueries({ queryKey: notificationsKeys.root(userId) }),
    mutationFn: async (action: NotificationAction): Promise<NotificationChange> => {
      assertSession(userId, useAuthStore.getState().refreshToken);
      if (action.kind === 'read')
        return { kind: 'read', item: await notificationsApi.read(action.id) };
      if (action.kind === 'delete') {
        const result = await notificationsApi.delete(action.id);
        return { kind: 'delete', id: action.id, unreadCounts: result.unreadCounts };
      }
      const result = await notificationsApi.readAll(action.filter);
      return { kind: 'readAll', filter: action.filter, unreadCounts: result.unreadCounts };
    },
    onSuccess: (change) => {
      client.setQueriesData<NotificationsData>(
        { queryKey: notificationsKeys.lists(userId) },
        (data) => updateNotifications(data, change),
      );
      if ('unreadCounts' in change)
        client.setQueryData(notificationsKeys.unread(userId), change.unreadCounts);
    },
    onSettled: () => client.invalidateQueries({ queryKey: notificationsKeys.root(userId) }),
  });
}
