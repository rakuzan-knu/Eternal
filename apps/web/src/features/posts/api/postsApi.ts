import { apiClient as api } from '@/shared/api/httpClient';
import { PostType } from '@/entities/post/model/types';
import { normalizePost } from '@/entities/post/api/postsApi';

export const postsApi = {
  createPost: (data: FormData, signal?: AbortSignal): Promise<PostType> =>
    api
      .post<Record<string, unknown>>('/posts', data, ...(signal ? [{ signal }] : []))
      .then((r) => normalizePost(r.data)),

  editPost: (postId: string | number, content: string, signal?: AbortSignal): Promise<PostType> =>
    api
      .patch<Record<string, unknown>>(
        `/posts/${postId}`,
        { content },
        ...(signal ? [{ signal }] : []),
      )
      .then((r) => normalizePost(r.data)),

  deletePost: (postId: string | number, signal?: AbortSignal) =>
    api.delete(`/posts/${postId}`, ...(signal ? [{ signal }] : [])).then((r) => r.data),

  votePoll: (postId: string | number, optionId: string, signal?: AbortSignal) =>
    api
      .post(`/posts/${postId}/poll/vote`, { optionId }, ...(signal ? [{ signal }] : []))
      .then((r) => r.data),

  like: (postId: string | number, signal?: AbortSignal) =>
    api.post(`/posts/${postId}/like`, ...(signal ? [{}, { signal }] : [])).then((r) => r.data),
  unlike: (postId: string | number, signal?: AbortSignal) =>
    api.delete(`/posts/${postId}/like`, ...(signal ? [{ signal }] : [])).then((r) => r.data),
  repost: (postId: string | number, signal?: AbortSignal) =>
    api.post(`/posts/${postId}/repost`, ...(signal ? [{}, { signal }] : [])).then((r) => r.data),
  unrepost: (postId: string | number, signal?: AbortSignal) =>
    api.delete(`/posts/${postId}/repost`, ...(signal ? [{ signal }] : [])).then((r) => r.data),
  save: (postId: string | number, signal?: AbortSignal) =>
    api.post(`/posts/${postId}/save`, ...(signal ? [{}, { signal }] : [])).then((r) => r.data),
  unsave: (postId: string | number, signal?: AbortSignal) =>
    api.delete(`/posts/${postId}/save`, ...(signal ? [{ signal }] : [])).then((r) => r.data),
  share: (postId: string | number, signal?: AbortSignal) =>
    api.post(`/posts/${postId}/share`, ...(signal ? [{}, { signal }] : [])).then((r) => r.data),
  report: (postId: string | number, reason: string, signal?: AbortSignal) =>
    api
      .post(`/posts/${postId}/report`, { reason }, ...(signal ? [{ signal }] : []))
      .then((r) => r.data),

  pin: (postId: string | number, signal?: AbortSignal): Promise<PostType> =>
    api
      .post<Record<string, unknown>>(`/posts/${postId}/pin`, ...(signal ? [{}, { signal }] : []))
      .then((r) => normalizePost(r.data)),

  unpin: (postId: string | number, signal?: AbortSignal): Promise<PostType> =>
    api
      .delete<Record<string, unknown>>(`/posts/${postId}/pin`, ...(signal ? [{ signal }] : []))
      .then((r) => normalizePost(r.data)),
};
