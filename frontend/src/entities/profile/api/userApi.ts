import { apiClient as api } from '@/shared/api/httpClient';
import { UserProfile } from '../model/types';

export const userApi = {
  getProfile: (userId: string) => api.get<UserProfile>(`/users/${userId}`).then((res) => res.data),

  getByUsername: (username: string) =>
    api.get<UserProfile>(`/users/by-username/${username}`).then((res) => res.data),

  getMe: () => api.get<UserProfile>('/users/me').then((res) => res.data),

  checkUsername: (username: string) => {
    const cleanUsername = username.replace(/^@+/, '').trim();
    return api
      .get<{ isAvailable: boolean }>(`/auth/check-username`, {
        params: { username: cleanUsername },
      })
      .then((res) => res.data);
  },

  updatePrimaryBadge: (badgeId: string | null) =>
    api.patch<UserProfile>('/users/primary-badge', { badgeId }).then((res) => res.data),

  syncGithub: () =>
    api
      .post<{ mergedPrsCount: number; githubUsername: string | null }>('/users/sync-github')
      .then((res) => res.data),

  unlinkGithub: () => api.delete<{ success: boolean }>('/auth/github').then((res) => res.data),
};
