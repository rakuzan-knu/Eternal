import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { followApi, FollowListPage, FollowUserSummary } from '../api/followApi';
import type { UserProfile } from '@/entities/profile/model/types';
import {
  USER_KEY,
  USER_BY_USERNAME_KEY,
  FOLLOW_LIST_KEY,
  FRIENDS_KEY,
  FEED_KEY,
  USER_POSTS_KEY,
  USER_REPOSTS_KEY,
  SAVED_POSTS_KEY,
} from '@/shared/api/queryKeys';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { FeedPage } from '@/entities/post/api/postsApi';

export function useFollowMutation(id: string, isFollowing: boolean) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (isFollowing ? followApi.unfollow(id) : followApi.follow(id)),
    onMutate: async () => {
      const myUserId = useAuthStore.getState().userId;
      const nextIsFollowing = !isFollowing;

      // 1. Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: [USER_KEY] });
      await queryClient.cancelQueries({ queryKey: [USER_BY_USERNAME_KEY] });
      await queryClient.cancelQueries({ queryKey: [FOLLOW_LIST_KEY] });
      await queryClient.cancelQueries({ queryKey: [FEED_KEY] });
      await queryClient.cancelQueries({ queryKey: [USER_POSTS_KEY] });
      await queryClient.cancelQueries({ queryKey: [USER_REPOSTS_KEY] });
      await queryClient.cancelQueries({ queryKey: [SAVED_POSTS_KEY] });
      await queryClient.cancelQueries({ queryKey: ['suggestedUsers'] });
      await queryClient.cancelQueries({ queryKey: ['miniProfile'] });

      // 2. Snapshot previous values for rollback
      const previousUsers = queryClient.getQueriesData<UserProfile>({ queryKey: [USER_KEY] });
      const previousFollowLists = queryClient.getQueriesData<InfiniteData<FollowListPage>>({
        queryKey: [FOLLOW_LIST_KEY],
      });
      const previousFeeds = queryClient.getQueriesData<InfiniteData<FeedPage>>({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === FEED_KEY ||
            key === USER_POSTS_KEY ||
            key === USER_REPOSTS_KEY ||
            key === SAVED_POSTS_KEY
          );
        },
      });
      const previousSuggested = queryClient.getQueriesData<FollowUserSummary[]>({
        queryKey: ['suggestedUsers'],
      });

      // 3. Optimistically update target user's profile and current user's profile
      queryClient.setQueriesData<UserProfile>(
        { queryKey: [USER_KEY] },
        (old: UserProfile | undefined) => {
          if (!old) return old;
          // Target user profile
          if (old.id === id) {
            return {
              ...old,
              isFollowing: nextIsFollowing,
              followersCount: Math.max(0, (old.followersCount ?? 0) + (nextIsFollowing ? 1 : -1)),
            };
          }
          // Current user profile (updates followingCount)
          if (myUserId && old.id === myUserId) {
            return {
              ...old,
              followingCount: Math.max(0, (old.followingCount ?? 0) + (nextIsFollowing ? 1 : -1)),
            };
          }
          return old;
        },
      );

      // Optimistically update user by username
      queryClient.setQueriesData<UserProfile>(
        { queryKey: [USER_BY_USERNAME_KEY] },
        (old: UserProfile | undefined) => {
          if (!old) return old;
          if (old.id === id) {
            return {
              ...old,
              isFollowing: nextIsFollowing,
              followersCount: Math.max(0, (old.followersCount ?? 0) + (nextIsFollowing ? 1 : -1)),
            };
          }
          return old;
        },
      );

      // 4. Optimistically update feed posts cache (real-time follow status on posts)
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        {
          predicate: (query) => {
            const key = query.queryKey[0];
            return (
              key === FEED_KEY ||
              key === USER_POSTS_KEY ||
              key === USER_REPOSTS_KEY ||
              key === SAVED_POSTS_KEY
            );
          },
        },
        (old: InfiniteData<FeedPage> | undefined) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: FeedPage) => ({
              ...page,
              posts: page.posts.map((p) =>
                p.authorId === id ? { ...p, isFollowing: nextIsFollowing } : p,
              ),
            })),
          };
        },
      );

      // 5. Optimistically update follow lists cache
      queryClient.setQueriesData<InfiniteData<FollowListPage>>(
        { queryKey: [FOLLOW_LIST_KEY] },
        (old: InfiniteData<FollowListPage> | undefined) => {
          if (!old?.pages) return old;

          return {
            ...old,
            pages: old.pages.map((page: FollowListPage) => ({
              ...page,
              items: page.items.map((u: FollowListPage['items'][number]) =>
                u.id === id ? { ...u, isFollowing: nextIsFollowing } : u,
              ),
            })),
          };
        },
      );

      // 6. Optimistically update suggested users list
      queryClient.setQueriesData<FollowUserSummary[]>(
        { queryKey: ['suggestedUsers'] },
        (old: FollowUserSummary[] | undefined) => {
          if (!old) return old;
          return old.map((u) => (u.id === id ? { ...u, isFollowing: nextIsFollowing } : u));
        },
      );

      // 7. Optimistically update mini profile hover cards
      queryClient.setQueriesData<Record<string, unknown>>(
        { queryKey: ['miniProfile'] },
        (old: Record<string, unknown> | undefined) => {
          if (!old || old.id !== id) return old;
          const currentFollowers = (old.followersCount as number) ?? 0;
          return {
            ...old,
            isFollowing: nextIsFollowing,
            followersCount: Math.max(0, currentFollowers + (nextIsFollowing ? 1 : -1)),
          };
        },
      );

      // If unfollowed and current user has an active following list, also update it
      if (myUserId && !nextIsFollowing) {
        queryClient.setQueryData<InfiniteData<FollowListPage>>(
          [FOLLOW_LIST_KEY, myUserId, 'following'],
          (old: InfiniteData<FollowListPage> | undefined) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: FollowListPage) => ({
                ...page,
                items: page.items.filter((u: FollowListPage['items'][number]) => u.id !== id),
              })),
            };
          },
        );
      }

      return { previousUsers, previousFollowLists, previousFeeds, previousSuggested };
    },
    onError: (_err, _vars, context) => {
      // Rollback optimistic updates
      if (context?.previousUsers) {
        for (const [key, data] of context.previousUsers) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousFollowLists) {
        for (const [key, data] of context.previousFollowLists) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousFeeds) {
        for (const [key, data] of context.previousFeeds) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousSuggested) {
        for (const [key, data] of context.previousSuggested) {
          queryClient.setQueryData(key, data);
        }
      }
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conversationId: '',
        messageId: '',
        title: 'Action Failed',
        body: 'Failed to update follow status. Please try again.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_BY_USERNAME_KEY] });
      queryClient.invalidateQueries({ queryKey: [FOLLOW_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [FRIENDS_KEY] });
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_REPOSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['suggestedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['miniProfile'] });
    },
  });
}
