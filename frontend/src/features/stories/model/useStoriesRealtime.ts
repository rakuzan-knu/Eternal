import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/shared/api/socket';
import { STORIES_FEED_KEY, USER_STORIES_KEY } from '@/shared/api/queryKeys';
import { useStoryViewerStore } from './useStoryViewerStore';
import type { UserStoriesGroup, StoryViewResponse } from './types';

export function useStoriesRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    if (!socket) return;

    // 1. When a new story is created by any followed user or friend
    const handleNewStory = (payload: { authorId: string; story: StoryViewResponse }) => {
      if (!payload?.authorId) return;

      // Invalidate feed so StoriesBar and glowing StoryAvatar rings light up immediately
      void queryClient.invalidateQueries({ queryKey: [STORIES_FEED_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USER_STORIES_KEY, payload.authorId] });

      // Optimistically update viewer store groups if already loaded
      const currentGroups = useStoryViewerStore.getState().groups;
      if (currentGroups.length > 0) {
        const groupIndex = currentGroups.findIndex((g) => g.user.id === payload.authorId);
        if (groupIndex >= 0) {
          const updatedGroups = [...currentGroups];
          const existingGroup = updatedGroups[groupIndex];
          updatedGroups[groupIndex] = {
            ...existingGroup,
            hasUnviewed: true,
            stories: [...existingGroup.stories, payload.story],
            latestStoryTimestamp: payload.story.createdAt,
          };
          useStoryViewerStore.getState().setGroups(updatedGroups);
        }
      }
    };

    // 2. When a story receives a new view
    const handleStoryViewed = (payload: {
      storyId: string;
      authorId: string;
      viewerId: string;
      viewer: any;
      viewedAt: string;
    }) => {
      if (!payload?.storyId) return;

      // Update query cache for stories feed if matching
      queryClient.setQueryData<UserStoriesGroup[]>([STORIES_FEED_KEY], (oldGroups) => {
        if (!oldGroups) return oldGroups;
        return oldGroups.map((group) => {
          if (group.user.id !== payload.authorId) return group;
          return {
            ...group,
            stories: group.stories.map((s) => {
              if (s.id !== payload.storyId) return s;
              return {
                ...s,
                viewsCount: s.viewsCount + 1,
              };
            }),
          };
        });
      });
    };

    // 3. When a story receives a new poll vote
    const handleStoryPollVoted = (payload: {
      storyId: string;
      authorId: string;
      userId: string;
      pollResult: any;
    }) => {
      if (!payload?.storyId || !payload?.pollResult) return;

      queryClient.setQueryData<UserStoriesGroup[]>([STORIES_FEED_KEY], (oldGroups) => {
        if (!oldGroups) return oldGroups;
        return oldGroups.map((group) => {
          if (group.user.id !== payload.authorId) return group;
          return {
            ...group,
            stories: group.stories.map((s) => {
              if (s.id !== payload.storyId) return s;
              return {
                ...s,
                pollResult: payload.pollResult,
              };
            }),
          };
        });
      });
    };

    socket.on('story:new', handleNewStory);
    socket.on('story:viewed', handleStoryViewed);
    socket.on('story:poll_voted', handleStoryPollVoted);

    return () => {
      socket.off('story:new', handleNewStory);
      socket.off('story:viewed', handleStoryViewed);
      socket.off('story:poll_voted', handleStoryPollVoted);
    };
  }, [queryClient]);
}
