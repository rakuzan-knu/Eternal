import type { ReelCommentResponseDto, ReelResponseDto } from '@social-network/shared-contracts';
import { getMobileApi } from '@/shared/api/client';
import type { Page } from '../../feed/model/feed';

const reelPath = (id: string) => `/reels/${encodeURIComponent(id)}`;

export const reelsApi = {
  feed: async (after: string | undefined, signal: AbortSignal) =>
    (
      await getMobileApi().get<Page<ReelResponseDto>>('/reels/feed', {
        params: { after, limit: 8 },
        signal,
      })
    ).data,
  byUser: async (userId: string, after: string | undefined, signal: AbortSignal) =>
    (
      await getMobileApi().get<Page<ReelResponseDto>>(`/reels/user/${encodeURIComponent(userId)}`, {
        params: { after, limit: 12 },
        signal,
      })
    ).data,
  like: async (id: string) =>
    (await getMobileApi().post<{ liked: boolean; likesCount: number }>(`${reelPath(id)}/like`))
      .data,
  save: async (id: string, saved: boolean) => {
    const path = `${reelPath(id)}/save`;
    const response = saved
      ? await getMobileApi().post<{ saved: boolean; savedCount: number }>(path)
      : await getMobileApi().delete<{ saved: boolean; savedCount: number }>(path);
    return response.data;
  },
  view: async (id: string) => {
    await getMobileApi().post(`${reelPath(id)}/view`);
  },
  share: async (id: string) => {
    await getMobileApi().post(`${reelPath(id)}/share`);
  },
  comments: async (id: string, signal: AbortSignal) =>
    (await getMobileApi().get<ReelCommentResponseDto[]>(`${reelPath(id)}/comments`, { signal }))
      .data,
  comment: async (id: string, content: string) =>
    (await getMobileApi().post<ReelCommentResponseDto>(`${reelPath(id)}/comments`, { content }))
      .data,
};
