import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@social-network/shared-api-client';
import { useAuthStore } from '@social-network/shared-stores';
import { assertSession } from '@/shared/api/client';
import { feedApi } from '../api/feedApi';
import {
  applyPostAction,
  nextCursor,
  updateFeed,
  type FeedData,
  type FeedMode,
  type PostAction,
} from './feed';

export const feedKeys = {
  posts: (userId: string) => ['mobile', userId, ...queryKeys.posts.all] as const,
  feeds: (userId: string) => ['mobile', userId, ...queryKeys.posts.all, 'feed'] as const,
  detail: (userId: string, postId: string) =>
    [...feedKeys.posts(userId), 'detail', postId] as const,
  feed: (userId: string, mode: FeedMode) =>
    ['mobile', userId, ...queryKeys.posts.feed(mode)] as const,
  stories: (userId: string) => ['mobile', userId, ...queryKeys.stories.feed()] as const,
  suggestions: (userId: string) => ['mobile', userId, 'suggested-users'] as const,
  comments: (userId: string, postId: string) =>
    ['mobile', userId, ...queryKeys.posts.comments(postId)] as const,
};

export function useFeed(userId: string, mode: FeedMode) {
  return useInfiniteQuery({
    queryKey: feedKeys.feed(userId, mode),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => feedApi.posts(mode, pageParam, signal),
    getNextPageParam: nextCursor,
    staleTime: 60_000,
  });
}

export function usePostActions(userId: string, postId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: feedKeys.posts(userId),
    mutationFn: ({ action, active }: { action: PostAction; active: boolean }) =>
      feedApi.action(postId, action, active),
    onMutate: () => client.cancelQueries({ queryKey: feedKeys.posts(userId) }),
    onSuccess: (_, { action, active }) => {
      client.setQueriesData<FeedData>({ queryKey: feedKeys.feeds(userId) }, (data) =>
        updateFeed(data, postId, (post) => applyPostAction(post, action, active)),
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: feedKeys.posts(userId) }),
  });
}

export function usePollVote(userId: string, postId: string) {
  const client = useQueryClient();
  return useMutation({
    onMutate: () => client.cancelQueries({ queryKey: feedKeys.posts(userId) }),
    mutationFn: (optionId: string) => {
      assertSession(userId, useAuthStore.getState().refreshToken);
      return feedApi.vote(postId, optionId);
    },
    onSuccess: (updated) => {
      client.setQueryData(feedKeys.detail(userId, postId), updated);
      client.setQueriesData<FeedData>({ queryKey: feedKeys.feeds(userId) }, (data) =>
        updateFeed(data, postId, () => updated),
      );
    },
  });
}
