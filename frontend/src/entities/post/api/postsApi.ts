import { apiClient as api } from '@/shared/api/httpClient';
import { PostType } from '../model/types';

export interface FeedPage {
  posts: PostType[];
  nextCursor: string | null;
}

export const postsApi = {
  getFeed: (after?: string, limit = 10) =>
    api.get<FeedPage>('/posts', { params: { after, limit } }).then((r) => r.data),

  getUserPosts: (userId: string, after?: string) =>
    api.get<FeedPage>(`/users/${userId}/posts`, { params: { after } }).then((r) => r.data),

  getUserReposts: (userId: string, after?: string) =>
    api.get<FeedPage>(`/users/${userId}/reposts`, { params: { after } }).then((r) => r.data),

  getPollVoters: (postId: string | number) =>
    api.get(`/posts/${postId}/poll/voters`).then((r) => r.data),

  getSavedPosts: (after?: string, limit = 10) =>
    api.get<FeedPage>('/users/me/saved-posts', { params: { after, limit } }).then((r) => r.data),

  getPostById: (postId: string) => api.get<PostType>(`/posts/${postId}`).then((r) => r.data),
};
