import { apiClient } from '@/shared/api/httpClient';
import type {
  CreateStoryPayload,
  StoryPollResult,
  StoryViewResponse,
  StoryViewersListResponse,
  StoryViewerUser,
  UserStoriesGroup,
} from '../model/types';

export const storiesApi = {
  async getFeed(signal?: AbortSignal): Promise<UserStoriesGroup[]> {
    const res = await apiClient.get<UserStoriesGroup[]>(
      '/stories/feed',
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  async getUserStories(userId: string, signal?: AbortSignal): Promise<UserStoriesGroup | null> {
    const res = await apiClient.get<UserStoriesGroup | null>(
      `/stories/user/${userId}`,
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  async createStory(payload: CreateStoryPayload, signal?: AbortSignal): Promise<StoryViewResponse> {
    const formData = new FormData();
    if (payload.file) {
      formData.append('file', payload.file);
    }
    if (payload.mediaType) {
      formData.append('mediaType', payload.mediaType);
    }
    if (payload.caption) {
      formData.append('caption', payload.caption);
    }
    if (payload.overlays && payload.overlays.length > 0) {
      formData.append('overlays', JSON.stringify(payload.overlays));
    }
    if (payload.privacy) {
      formData.append('privacy', payload.privacy);
    }
    if (payload.backgroundColor) {
      formData.append('backgroundColor', payload.backgroundColor);
    }
    if (payload.filter) {
      formData.append('filter', payload.filter);
    }

    const res = await apiClient.post<StoryViewResponse>('/stories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...(signal ? { signal } : {}),
    });
    return res.data;
  },

  async viewStory(storyId: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post(`/stories/${storyId}/view`, ...(signal ? [{}, { signal }] : []));
  },

  async reactToStory(
    storyId: string,
    emoji: string,
    signal?: AbortSignal,
  ): Promise<{ emoji: string }> {
    const res = await apiClient.post<{ emoji: string }>(
      `/stories/${storyId}/react`,
      { emoji },
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  async votePoll(
    storyId: string,
    optionIndex: number,
    signal?: AbortSignal,
  ): Promise<StoryPollResult> {
    const res = await apiClient.post<StoryPollResult>(
      `/stories/${storyId}/poll-vote`,
      {
        optionIndex,
      },
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  async replyToStory(
    storyId: string,
    text: string,
    signal?: AbortSignal,
  ): Promise<{ conversationId: string; message: any }> {
    const res = await apiClient.post(
      `/stories/${storyId}/reply`,
      { text },
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  async getStoryViewers(storyId: string, signal?: AbortSignal): Promise<StoryViewersListResponse> {
    const res = await apiClient.get<StoryViewersListResponse>(
      `/stories/${storyId}/viewers`,
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  async deleteStory(storyId: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete(`/stories/${storyId}`, ...(signal ? [{ signal }] : []));
  },

  async getCloseFriends(signal?: AbortSignal): Promise<StoryViewerUser[]> {
    const res = await apiClient.get<StoryViewerUser[]>(
      '/stories/close-friends/list',
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  async toggleCloseFriend(
    friendId: string,
    signal?: AbortSignal,
  ): Promise<{ isCloseFriend: boolean }> {
    const res = await apiClient.post<{ isCloseFriend: boolean }>(
      `/stories/close-friends/${friendId}`,
      ...(signal ? [{}, { signal }] : []),
    );
    return res.data;
  },
};
