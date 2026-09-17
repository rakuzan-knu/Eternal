import { apiClient as api } from '@/shared/api/httpClient';
import { UserProfile } from '../model/types';

export const userApi = {
  getProfile: (userId: string, signal?: AbortSignal) =>
    api
      .get<UserProfile>(`/users/${userId}`, ...(signal ? [{ signal }] : []))
      .then((res) => res.data),

  getByUsername: (username: string, signal?: AbortSignal) =>
    api
      .get<UserProfile>(`/users/by-username/${username}`, ...(signal ? [{ signal }] : []))
      .then((res) => res.data),

  getMe: (signal?: AbortSignal) =>
    api.get<UserProfile>('/users/me', ...(signal ? [{ signal }] : [])).then((res) => res.data),

  checkUsername: (username: string, signal?: AbortSignal) => {
    const cleanUsername = username.replace(/^@+/, '').trim();
    return api
      .get<{ isAvailable: boolean }>(`/auth/check-username`, {
        params: { username: cleanUsername },
        ...(signal ? { signal } : {}),
      })
      .then((res) => res.data);
  },

  updatePrimaryBadge: (badgeId: string | null, signal?: AbortSignal) =>
    api
      .patch<UserProfile>('/users/primary-badge', { badgeId }, ...(signal ? [{ signal }] : []))
      .then((res) => res.data),

  syncGithub: (signal?: AbortSignal) =>
    api
      .post<{ mergedPrsCount: number; githubUsername: string | null }>(
        '/users/sync-github',
        ...(signal ? [{}, { signal }] : []),
      )
      .then((res) => res.data),

  unlinkGithub: (signal?: AbortSignal) =>
    api
      .delete<{ success: boolean }>('/auth/github', ...(signal ? [{ signal }] : []))
      .then((res) => res.data),
};
