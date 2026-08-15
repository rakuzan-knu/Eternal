import { apiClient as api } from '@/shared/api/httpClient';
import type { FoundUserResponse } from '../model/types';
import type { UserProfile } from '@/entities/profile/model/types';
import type { LoginDto, RegisterDto } from '@backend/common/contracts';

export type LoginPayload = Partial<LoginDto> & {
  email?: string;
  identity?: string;
  password?: string;
};

export type RegisterPayload = Partial<RegisterDto> & {
  email: string;
  username: string;
  displayName?: string;
  password?: string;
  birthDate?: string;
};

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
