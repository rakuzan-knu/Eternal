import { apiClient as api } from '@/shared/api/httpClient';
import { PostType } from '@/entities/post/model/types';
import { normalizePost } from '@/entities/post/api/postsApi';

export const postsApi = {
  createPost: (data: FormData): Promise<PostType> =>
    api
      .post<Record<string, unknown>>('/posts', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => normalizePost(r.data)),

  votePoll: (postId: string | number, optionId: string) =>
    api.post(`/posts/${postId}/poll/vote`, { optionId }).then((r) => r.data),

  like: (postId: string | number) => api.post(`/posts/${postId}/like`).then((r) => r.data),
  unlike: (postId: string | number) => api.delete(`/posts/${postId}/like`).then((r) => r.data),
  repost: (postId: string | number) => api.post(`/posts/${postId}/repost`).then((r) => r.data),
  unrepost: (postId: string | number) => api.delete(`/posts/${postId}/repost`).then((r) => r.data),
  save: (postId: string | number) => api.post(`/posts/${postId}/save`).then((r) => r.data),
  unsave: (postId: string | number) => api.delete(`/posts/${postId}/save`).then((r) => r.data),
  share: (postId: string | number) => api.post(`/posts/${postId}/share`).then((r) => r.data),
};
