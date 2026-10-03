import type {
  CommentResponseDto,
  PostResponseDto,
  UserProfileDto,
  UserStoriesGroup,
} from '@social-network/shared-contracts';
import { getMobileApi } from '@/shared/api/client';
import type { FeedMode, Page, PostAction } from '../model/feed';

const postPath = (id: string) => `/posts/${encodeURIComponent(id)}`;

export const feedApi = {
  post: async (id: string, signal: AbortSignal) =>
    (await getMobileApi().get<PostResponseDto>(postPath(id), { signal })).data,
  posts: async (mode: FeedMode, after: string | undefined, signal: AbortSignal) => {
    const response = await getMobileApi().get<Page<PostResponseDto>>(
      mode === 'saved' ? '/users/me/saved-posts' : '/posts',
      { params: { after, limit: 10 }, signal },
    );
    return response.data;
  },
  stories: async (signal: AbortSignal) =>
    (await getMobileApi().get<UserStoriesGroup[]>('/stories/feed', { signal })).data,
  suggestions: async (signal: AbortSignal) =>
    (
      await getMobileApi().get<UserProfileDto[]>('/users/suggested', {
        params: { limit: 8 },
        signal,
      })
    ).data,
  follow: async (id: string) =>
    (
      await getMobileApi().post<{ status: 'ACCEPTED' | 'PENDING' }>(
        `/users/${encodeURIComponent(id)}/follow`,
      )
    ).data,
  unfollow: async (id: string) => {
    await getMobileApi().delete(`/users/${encodeURIComponent(id)}/follow`);
  },
  action: async (id: string, action: PostAction, active: boolean) => {
    const path = `${postPath(id)}/${action}`;
    if (active) await getMobileApi().post(path);
    else await getMobileApi().delete(path);
  },
  create: async (body: FormData) =>
    (await getMobileApi().post<PostResponseDto>('/posts', body)).data,
  vote: async (id: string, optionId: string) => {
    const api = getMobileApi();
    await api.post(`${postPath(id)}/poll/vote`, { optionId });
    return (await api.get<PostResponseDto>(postPath(id))).data;
  },
  comments: async (id: string, after: string | undefined, signal: AbortSignal) =>
    (
      await getMobileApi().get<Page<CommentResponseDto>>(`${postPath(id)}/comments`, {
        params: { after, limit: 20 },
        signal,
      })
    ).data,
  comment: async (id: string, text: string) =>
    (await getMobileApi().post<CommentResponseDto>(`${postPath(id)}/comments`, { text })).data,
  viewStory: async (id: string) => {
    await getMobileApi().post(`/stories/${encodeURIComponent(id)}/view`);
  },
  share: async (id: string) => {
    await getMobileApi().post(`${postPath(id)}/share`);
  },
};
