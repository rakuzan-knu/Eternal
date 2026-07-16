import { apiClient as api } from '@/shared/api/httpClient';
import { UserProfile } from '../model/types';

export const userApi = {
  getProfile: (userId: string) => api.get<UserProfile>(`/users/${userId}`).then((res) => res.data),

  getByUsername: (username: string) =>
    api.get<UserProfile>(`/users/by-username/${username}`).then((res) => res.data),

  getMe: () => api.get<UserProfile>('/users/me').then((res) => res.data),

  checkUsername: (username: string) =>
    api
      .get<{ isAvailable: boolean }>(`/auth/check-username`, { params: { username } })
      .then((res) => res.data),
};
