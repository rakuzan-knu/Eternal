import axios from 'axios';
import { FoundUserResponse } from '../model/types';

export interface LoginPayload {
  identity: string;
  password?: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  username: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
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
  user: {
    id: string;
    username: string;
    email?: string;
    phone?: string;
  };
  token: string;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', data).then((res) => res.data),

  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data).then((res) => res.data),

  findAccount: (identifier: string) =>
    api
      .post<FoundUserResponse>('/auth/find-account', { identifier } satisfies FindAccountPayload)
      .then((res) => res.data),

  resetPassword: (data: ResetPasswordPayload) =>
    api.post<{ success: boolean }>('/auth/reset-password', data).then((res) => res.data),
};
