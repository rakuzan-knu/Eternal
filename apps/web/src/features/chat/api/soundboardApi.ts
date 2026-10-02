import { apiClient as api } from '@/shared/api/httpClient';

export interface SoundboardApiResponseItem {
  id: string;
  name: string;
  emoji: string;
  scope: 'my' | 'chat';
  userId?: string;
  conversationId?: string;
  durationMs: number;
  audioData?: string;
  audioUrl?: string;
  authorName?: string;
  createdAt?: number;
}

export interface CreateSoundboardPayload {
  name: string;
  emoji: string;
  durationMs?: number;
  audioData?: string;
  audioUrl?: string;
}

export const soundboardApi = {
  getMySounds: (): Promise<SoundboardApiResponseItem[]> =>
    api.get<SoundboardApiResponseItem[]>('/soundboard/my').then((res) => res.data),

  createMySound: (payload: CreateSoundboardPayload): Promise<SoundboardApiResponseItem> =>
    api.post<SoundboardApiResponseItem>('/soundboard/my', payload).then((res) => res.data),

  deleteMySound: (id: string): Promise<{ success: boolean }> =>
    api.delete<{ success: boolean }>(`/soundboard/my/${id}`).then((res) => res.data),

  getChatSounds: (conversationId: string): Promise<SoundboardApiResponseItem[]> =>
    api
      .get<SoundboardApiResponseItem[]>(`/soundboard/chat/${conversationId}`)
      .then((res) => res.data),

  createChatSound: (
    conversationId: string,
    payload: CreateSoundboardPayload,
  ): Promise<SoundboardApiResponseItem> =>
    api
      .post<SoundboardApiResponseItem>(`/soundboard/chat/${conversationId}`, payload)
      .then((res) => res.data),

  deleteChatSound: (conversationId: string, id: string): Promise<{ success: boolean }> =>
    api
      .delete<{ success: boolean }>(`/soundboard/chat/${conversationId}/${id}`)
      .then((res) => res.data),
};
