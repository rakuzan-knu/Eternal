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
  async getFeed(): Promise<UserStoriesGroup[]> {
    const res = await apiClient.get<UserStoriesGroup[]>('/stories/feed');
    return res.data;
  },

  async getUserStories(userId: string): Promise<UserStoriesGroup | null> {
    const res = await apiClient.get<UserStoriesGroup | null>(`/stories/user/${userId}`);
    return res.data;
  },

  async createStory(payload: CreateStoryPayload): Promise<StoryViewResponse> {
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

    const res = await apiClient.post<StoryViewResponse>('/stories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async viewStory(storyId: string): Promise<void> {
    await apiClient.post(`/stories/${storyId}/view`);
  },

  async reactToStory(storyId: string, emoji: string): Promise<{ emoji: string }> {
    const res = await apiClient.post<{ emoji: string }>(`/stories/${storyId}/react`, { emoji });
    return res.data;
  },

  async votePoll(storyId: string, optionIndex: number): Promise<StoryPollResult> {
    const res = await apiClient.post<StoryPollResult>(`/stories/${storyId}/poll-vote`, {
      optionIndex,
    });
    return res.data;
  },

  async replyToStory(
    storyId: string,
    text: string,
  ): Promise<{ conversationId: string; message: any }> {
    const res = await apiClient.post(`/stories/${storyId}/reply`, { text });
    return res.data;
  },

  async getStoryViewers(storyId: string): Promise<StoryViewersListResponse> {
    const res = await apiClient.get<StoryViewersListResponse>(`/stories/${storyId}/viewers`);
    return res.data;
  },

  async deleteStory(storyId: string): Promise<void> {
    await apiClient.delete(`/stories/${storyId}`);
  },

  async getCloseFriends(): Promise<StoryViewerUser[]> {
    const res = await apiClient.get<StoryViewerUser[]>('/stories/close-friends/list');
    return res.data;
  },

  async toggleCloseFriend(friendId: string): Promise<{ isCloseFriend: boolean }> {
    const res = await apiClient.post<{ isCloseFriend: boolean }>(
      `/stories/close-friends/${friendId}`,
    );
    return res.data;
  },
};
