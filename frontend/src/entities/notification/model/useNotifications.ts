import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NOTIFICATIONS_KEY, UNREAD_NOTIFICATIONS_COUNT_KEY } from '@/shared/api/queryKeys';
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
import { followApi } from '@/features/follow/api/followApi';
import { useEffect } from 'react';

export function useNotifications(filter: NotificationFilter = 'all') {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUnreadCounts = useNotificationStore((state) => state.setUnreadCounts);

  const isEnabled =
    isAuthenticated ||
    (typeof window !== 'undefined' && Boolean(localStorage.getItem('accessToken'))) ||
    Boolean((import.meta as { env?: { MODE?: string } }).env?.MODE === 'test');

  const query = useInfiniteQuery({
    queryKey: [NOTIFICATIONS_KEY, filter],
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

  const isEnabled =
    isAuthenticated ||
    (typeof window !== 'undefined' && Boolean(localStorage.getItem('accessToken'))) ||
    Boolean((import.meta as { env?: { MODE?: string } }).env?.MODE === 'test');

  return useQuery({
    queryKey: [UNREAD_NOTIFICATIONS_COUNT_KEY],
    queryFn: async () => {
      const counts = await fetchUnreadNotificationCounts();
      setUnreadCounts(counts);
      return counts;
    },
    enabled: isEnabled,
    retry: 1,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_KEY] });

      queryClient.setQueriesData<{
        pages: PaginatedNotificationsResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: [NOTIFICATIONS_KEY] }, (old) => {
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
      queryClient.invalidateQueries({ queryKey: [UNREAD_NOTIFICATIONS_COUNT_KEY] });
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
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_KEY] });

      queryClient.setQueriesData<{
        pages: PaginatedNotificationsResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: [NOTIFICATIONS_KEY] }, (old) => {
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
      queryClient.invalidateQueries({ queryKey: [UNREAD_NOTIFICATIONS_COUNT_KEY] });
    },
  });
}

export function useFollowBack() {
  const optimisticFollows = useNotificationStore((state) => state.optimisticFollows);
  const setOptimisticFollow = useNotificationStore((state) => state.setOptimisticFollow);

  const followMutation = useMutation({
    mutationFn: async ({
      userId,
      isCurrentlyFollowing,
    }: {
      userId: string;
      isCurrentlyFollowing: boolean;
    }) => {
      if (isCurrentlyFollowing) {
        await followApi.unfollow(userId);
      } else {
        await followApi.follow(userId);
      }
    },
    onMutate: ({ userId, isCurrentlyFollowing }) => {
      setOptimisticFollow(userId, !isCurrentlyFollowing, true);
    },
    onSuccess: (_, { userId, isCurrentlyFollowing }) => {
      setOptimisticFollow(userId, !isCurrentlyFollowing, false);
    },
    onError: (_, { userId, isCurrentlyFollowing }) => {
      setOptimisticFollow(userId, isCurrentlyFollowing, false);
    },
  });

  const toggleFollow = (userId: string, isCurrentlyFollowing: boolean) => {
    const current = optimisticFollows[userId];
    if (current?.isLoading) return;
    const targetState = current !== undefined ? current.isFollowing : isCurrentlyFollowing;
    followMutation.mutate({ userId, isCurrentlyFollowing: targetState });
  };

  return {
    toggleFollow,
    isFollowing: (userId: string, defaultFollowing = false) =>
      optimisticFollows[userId]?.isFollowing ?? defaultFollowing,
    isLoading: (userId: string) => Boolean(optimisticFollows[userId]?.isLoading),
  };
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_KEY] });

      queryClient.setQueriesData<{
        pages: PaginatedNotificationsResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: [NOTIFICATIONS_KEY] }, (old) => {
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
      queryClient.invalidateQueries({ queryKey: [UNREAD_NOTIFICATIONS_COUNT_KEY] });
    },
  });
}

export function useMuteNotificationAuthor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actorId: string) => muteNotificationAuthor(actorId),
    onMutate: async (actorId: string) => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_KEY] });

      queryClient.setQueriesData<{
        pages: PaginatedNotificationsResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: [NOTIFICATIONS_KEY] }, (old) => {
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
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}
