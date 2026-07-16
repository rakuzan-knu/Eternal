import { apiClient as api } from '@/shared/api/httpClient';
import { PostType } from '@/entities/post/model/types';

export const postsApi = {
  createPost: (data: FormData) =>
    api
      .post<PostType>('/posts', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),

  votePoll: (postId: string | number, optionId: string) =>
    api.post(`/posts/${postId}/poll/vote`, { optionId }).then((r) => r.data),

  like: (postId: string | number) => api.post(`/posts/${postId}/like`).then((r) => r.data),
  unlike: (postId: string | number) => api.delete(`/posts/${postId}/like`).then((r) => r.data),
  repost: (postId: string | number) => api.post(`/posts/${postId}/repost`).then((r) => r.data),
};
