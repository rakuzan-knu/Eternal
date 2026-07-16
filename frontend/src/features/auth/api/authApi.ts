import { apiClient as api } from '@/shared/api/httpClient';
import { FoundUserResponse } from '../model/types';
import { UserProfile } from '@/entities/profile/model/types';

export interface LoginPayload {
  identity: string;
  password?: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  username: string;
  birthDate: string;
  gender: 'Male' | 'Female' | 'Custom' | string;
  identity: string;
  password?: string;
}

export interface FindAccountPayload {
  identifier: string;
}

export interface ResetPasswordPayload {
  userId?: string;
  identity?: string;
  code?: string;
  newPassword?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', data).then((res) => res.data),

  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data).then((res) => res.data),

  logout: (refreshToken?: string) => {
    const token = refreshToken || localStorage.getItem('refreshToken') || '';
    return api.post('/auth/logout', { refreshToken: token });
  },

  findAccount: (identifier: string) =>
    api
      .post<FoundUserResponse>('/auth/find-account', { identifier } satisfies FindAccountPayload)
      .then((res) => res.data),

  resetPassword: (data: ResetPasswordPayload) =>
    api.post<{ success: boolean }>('/auth/reset-password', data).then((res) => res.data),
};
