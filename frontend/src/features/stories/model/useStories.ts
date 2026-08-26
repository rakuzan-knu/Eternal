import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storiesApi } from '../api/storiesApi';
import {
  STORIES_FEED_KEY,
  USER_STORIES_KEY,
  CLOSE_FRIENDS_KEY,
  CONVERSATIONS_KEY,
} from '@/shared/api/queryKeys';
import type { CreateStoryPayload, StoryPollResult, UserStoriesGroup } from './types';

export function useStoriesFeed() {
  return useQuery({
    queryKey: [STORIES_FEED_KEY],
    queryFn: () => storiesApi.getFeed(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useUserStories(userId?: string | null) {
  return useQuery({
    queryKey: [USER_STORIES_KEY, userId],
    queryFn: () => (userId ? storiesApi.getUserStories(userId) : null),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStoryPayload) => storiesApi.createStory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORIES_FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_STORIES_KEY] });
    },
  });
}

export function useViewStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storyId: string) => storiesApi.viewStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORIES_FEED_KEY] });
    },
  });
}

export function useReactStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, emoji }: { storyId: string; emoji: string }) =>
      storiesApi.reactToStory(storyId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORIES_FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_STORIES_KEY] });
    },
  });
}

export function useVoteStoryPoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, optionIndex }: { storyId: string; optionIndex: number }) =>
      storiesApi.votePoll(storyId, optionIndex),
    onSuccess: (data: StoryPollResult, variables) => {
      queryClient.setQueryData<UserStoriesGroup[]>([STORIES_FEED_KEY], (oldFeed) => {
        if (!oldFeed) return oldFeed;
        return oldFeed.map((group) => ({
          ...group,
          stories: group.stories.map((s) =>
            s.id === variables.storyId ? { ...s, pollResult: data } : s,
          ),
        }));
      });
    },
  });
}

export function useReplyStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, text }: { storyId: string; text: string }) =>
      storiesApi.replyToStory(storyId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storyId: string) => storiesApi.deleteStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORIES_FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_STORIES_KEY] });
    },
  });
}

export function useCloseFriends() {
  return useQuery({
    queryKey: [CLOSE_FRIENDS_KEY],
    queryFn: () => storiesApi.getCloseFriends(),
  });
}

export function useToggleCloseFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendId: string) => storiesApi.toggleCloseFriend(friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLOSE_FRIENDS_KEY] });
      queryClient.invalidateQueries({ queryKey: [STORIES_FEED_KEY] });
    },
  });
}
