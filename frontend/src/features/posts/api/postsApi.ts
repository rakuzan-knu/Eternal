import { apiClient as api } from '@/shared/api/httpClient';
import { PostType } from '@/entities/post/model/types';
import { normalizePost } from '@/entities/post/api/postsApi';

export const postsApi = {
  createPost: (data: FormData): Promise<PostType> =>
    api.post<Record<string, unknown>>('/posts', data).then((r) => normalizePost(r.data)),

  editPost: (postId: string | number, content: string): Promise<PostType> =>
    api
      .patch<Record<string, unknown>>(`/posts/${postId}`, { content })
      .then((r) => normalizePost(r.data)),

  deletePost: (postId: string | number) => api.delete(`/posts/${postId}`).then((r) => r.data),

  votePoll: (postId: string | number, optionId: string) =>
    api.post(`/posts/${postId}/poll/vote`, { optionId }).then((r) => r.data),

  like: (postId: string | number) => api.post(`/posts/${postId}/like`).then((r) => r.data),
  unlike: (postId: string | number) => api.delete(`/posts/${postId}/like`).then((r) => r.data),
  repost: (postId: string | number) => api.post(`/posts/${postId}/repost`).then((r) => r.data),
  unrepost: (postId: string | number) => api.delete(`/posts/${postId}/repost`).then((r) => r.data),
  save: (postId: string | number) => api.post(`/posts/${postId}/save`).then((r) => r.data),
  unsave: (postId: string | number) => api.delete(`/posts/${postId}/save`).then((r) => r.data),
  share: (postId: string | number) => api.post(`/posts/${postId}/share`).then((r) => r.data),
  report: (postId: string | number, reason: string) =>
    api.post(`/posts/${postId}/report`, { reason }).then((r) => r.data),

  pin: (postId: string | number): Promise<PostType> =>
    api.post<Record<string, unknown>>(`/posts/${postId}/pin`).then((r) => normalizePost(r.data)),

  unpin: (postId: string | number): Promise<PostType> =>
    api.delete<Record<string, unknown>>(`/posts/${postId}/pin`).then((r) => normalizePost(r.data)),
};
