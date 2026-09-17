import { apiClient as api } from '@/shared/api/httpClient';
import type { FoundUserResponse } from '../model/types';
import type { UserProfile } from '@/entities/profile/model/types';
import type { LoginDto, RegisterDto } from '@backend/common/contracts';

export type LoginPayload = Partial<LoginDto> & {
  email?: string;
  identity?: string;
  password?: string;
  turnstileToken?: string;
};

export type RegisterPayload = Partial<RegisterDto> & {
  email: string;
  username: string;
  displayName?: string;
  password?: string;
  birthDate?: string;
  turnstileToken?: string;
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
  login: (data: LoginPayload, signal?: AbortSignal) =>
    api
      .post<AuthResponse>('/auth/login', data, ...(signal ? [{ signal }] : []))
      .then((res) => res.data),

  register: (data: RegisterPayload, signal?: AbortSignal) =>
    api
      .post<AuthResponse>('/auth/register', data, ...(signal ? [{ signal }] : []))
      .then((res) => res.data),

  logout: (refreshToken?: string, signal?: AbortSignal) => {
    const token = refreshToken || localStorage.getItem('refreshToken') || '';
    return api.post('/auth/logout', { refreshToken: token }, ...(signal ? [{ signal }] : []));
  },

  findAccount: (identifier: string, signal?: AbortSignal) =>
    api
      .post<FoundUserResponse>(
        '/auth/find-account',
        { identifier } satisfies FindAccountPayload,
        ...(signal ? [{ signal }] : []),
      )
      .then((res) => res.data),

  resetPassword: (data: ResetPasswordPayload, signal?: AbortSignal) =>
    api
      .post<{ success: boolean }>('/auth/reset-password', data, ...(signal ? [{ signal }] : []))
      .then((res) => res.data),
};
