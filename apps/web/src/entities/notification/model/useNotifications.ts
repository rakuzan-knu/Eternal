import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadNotificationCounts,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  muteNotificationAuthor,
} from '../api/notificationApi';
import { NotificationFilter, PaginatedNotificationsResponse } from './types';
import { useNotificationStore } from './useNotificationStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { useEffect } from 'react';

export function useNotifications(filter: NotificationFilter = 'all') {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUnreadCounts = useNotificationStore((state) => state.setUnreadCounts);
  const isGameModeOpen = useSpotifyPlayerStore((state) => state.isGameModeOpen);

  const isEnabled =
    (isAuthenticated ||
      (typeof window !== 'undefined' && Boolean(localStorage.getItem('accessToken'))) ||
      Boolean((import.meta as { env?: { MODE?: string } }).env?.MODE === 'test')) &&
    !isGameModeOpen;

  const query = useInfiniteQuery({
    queryKey: queryKeys.notifications.list(filter),
    queryFn: ({ pageParam }) =>
      fetchNotifications({
        type: filter,
        cursor: pageParam as string | undefined,
        limit: 20,
      }),
    enabled: isEnabled,
    retry: 1,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.hasMore && lastPage?.nextCursor ? lastPage.nextCursor : undefined,
  });

  useEffect(() => {
    if (query.data?.pages?.[0]?.unreadCounts) {
      setUnreadCounts(query.data.pages[0].unreadCounts);
    }
  }, [query.data, setUnreadCounts]);

  return query;
}

export function useUnreadCountsQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUnreadCounts = useNotificationStore((state) => state.setUnreadCounts);
  const isGameModeOpen = useSpotifyPlayerStore((state) => state.isGameModeOpen);

  const isEnabled =
    (isAuthenticated ||
      Boolean((import.meta as { env?: { MODE?: string } }).env?.MODE === 'test')) &&
    !isGameModeOpen;

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async () => {
      const counts = await fetchUnreadNotificationCounts();
      setUnreadCounts(counts);
      return counts;
    },
    enabled: isEnabled,
    retry: 1,
    staleTime: queryStaleTimes.notifications,
    refetchOnWindowFocus: !isGameModeOpen,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.root });

      queryClient.setQueriesData<{
        pages: PaginatedNotificationsResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: queryKeys.notifications.root }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
          })),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const resetUnreadCountForFilter = useNotificationStore(
    (state) => state.resetUnreadCountForFilter,
  );

  return useMutation({
    mutationFn: (filter?: NotificationFilter) => markAllNotificationsAsRead(filter),
    onMutate: async (filter = 'all') => {
      resetUnreadCountForFilter(filter);
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.root });

      queryClient.setQueriesData<{
        pages: PaginatedNotificationsResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: queryKeys.notifications.root }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => ({ ...item, isRead: true })),
            unreadCounts: {
              ...page.unreadCounts,
              total:
                filter === 'all'
                  ? 0
                  : Math.max(0, page.unreadCounts.total - (page.unreadCounts[filter] || 0)),
              ...(filter !== 'all'
                ? { [filter]: 0 }
                : {
                    likes: 0,
                    comments: 0,
                    follows: 0,
                    mentions: 0,
                    reposts: 0,
                    system: 0,
                  }),
            },
          })),
        };
      });
    },
    onSuccess: (data) => {
      useNotificationStore.getState().setUnreadCounts(data.unreadCounts);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.root });

      queryClient.setQueriesData<{
        pages: PaginatedNotificationsResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: queryKeys.notifications.root }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== id),
          })),
        };
      });
    },
    onSuccess: (data) => {
      if (data?.unreadCounts) {
        useNotificationStore.getState().setUnreadCounts(data.unreadCounts);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}

export function useMuteNotificationAuthor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actorId: string) => muteNotificationAuthor(actorId),
    onMutate: async (actorId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.root });

      queryClient.setQueriesData<{
        pages: PaginatedNotificationsResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: queryKeys.notifications.root }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.actorId !== actorId),
          })),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.root });
    },
  });
}
