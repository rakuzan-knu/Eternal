import type { AxiosInstance } from 'axios';
import { useMutation, useQuery, type UseMutationOptions } from '@tanstack/react-query';
import { createApiClient } from './client';
import { queryKeys } from './queryKeys';
import type {
  AuthResponse,
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
} from '@social-network/shared-contracts';

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

export interface ResetPasswordPayload {
  userId?: string;
  identity?: string;
  code?: string;
  newPassword?: string;
  [key: string]: unknown;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
}

let activeApiClient: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (!activeApiClient) {
    const defaultUrl = 'http://localhost:3000';
    activeApiClient = createApiClient({
      baseURL: defaultUrl,
      getToken: () => {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem('accessToken');
        }
        return null;
      },
      getRefreshToken: () => {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem('refreshToken');
        }
        return null;
      },
      onTokenRefreshed: ({ accessToken, refreshToken }) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
          }
        }
      },
      onUnauthorized: () => {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      },
    });
  }
  return activeApiClient;
}

export function setApiClient(client: AxiosInstance): void {
  activeApiClient = client;
}

export const authApi = {
  login: async (
    data: LoginPayload,
    options?: { client?: AxiosInstance; signal?: AbortSignal },
  ): Promise<AuthResponse> => {
    const client = options?.client ?? getApiClient();
    const config = options?.signal ? { signal: options.signal } : undefined;
    const res = await client.post<AuthResponse>('/auth/login', data, config);
    return res.data;
  },

  register: async (
    data: RegisterPayload,
    options?: { client?: AxiosInstance; signal?: AbortSignal },
  ): Promise<AuthResponse> => {
    const client = options?.client ?? getApiClient();
    const config = options?.signal ? { signal: options.signal } : undefined;
    const res = await client.post<AuthResponse>('/auth/register', data, config);
    return res.data;
  },

  forgotPassword: async (
    data: ForgotPasswordDto,
    options?: { client?: AxiosInstance; signal?: AbortSignal },
  ): Promise<ForgotPasswordResponse> => {
    const client = options?.client ?? getApiClient();
    const config = options?.signal ? { signal: options.signal } : undefined;
    try {
      const res = await client.post<Partial<ForgotPasswordResponse>>(
        '/auth/find-account',
        {
          identifier: data.email,
        },
        config,
      );
      return {
        success: true,
        ...res.data,
      };
    } catch {
      return {
        success: true,
        message: 'If an account exists with this email, instructions have been sent.',
      };
    }
  },

  resetPassword: async (
    data: ResetPasswordPayload,
    options?: { client?: AxiosInstance; signal?: AbortSignal },
  ): Promise<{ success: boolean }> => {
    const client = options?.client ?? getApiClient();
    const config = options?.signal ? { signal: options.signal } : undefined;
    const res = await client.post<{ success: boolean }>('/auth/reset-password', data, config);
    return res.data;
  },

  logout: async (
    refreshToken?: string,
    options?: { client?: AxiosInstance; signal?: AbortSignal },
  ): Promise<void> => {
    const client = options?.client ?? getApiClient();
    const token =
      refreshToken ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') || '' : '');
    const config = options?.signal ? { signal: options.signal } : undefined;
    await client.post('/auth/logout', { refreshToken: token }, config);
  },

  refreshToken: async (
    refreshToken: string,
    options?: { client?: AxiosInstance; signal?: AbortSignal },
  ): Promise<{ accessToken: string; refreshToken?: string }> => {
    const client = options?.client ?? getApiClient();
    const config = options?.signal ? { signal: options.signal } : undefined;
    const res = await client.post<{ accessToken: string; refreshToken?: string }>(
      '/auth/refresh',
      { refreshToken },
      config,
    );
    return res.data;
  },

  checkUsername: async (
    username: string,
    options?: { client?: AxiosInstance; signal?: AbortSignal },
  ): Promise<{ isAvailable: boolean }> => {
    const client = options?.client ?? getApiClient();
    const config = options?.signal ? { signal: options.signal } : undefined;
    const cleanUsername = username.replace(/^@+/, '').trim();
    const res = await client.get<{ isAvailable: boolean }>('/auth/check-username', {
      params: { username: cleanUsername },
      ...config,
    });
    return res.data;
  },
};

export function useLogin(
  options?: Omit<UseMutationOptions<AuthResponse, Error, LoginPayload>, 'mutationFn'>,
) {
  return useMutation({
    mutationFn: (data: LoginPayload) => authApi.login(data),
    ...options,
  });
}

export function useRegister(
  options?: Omit<UseMutationOptions<AuthResponse, Error, RegisterPayload>, 'mutationFn'>,
) {
  return useMutation({
    mutationFn: (data: RegisterPayload) => authApi.register(data),
    ...options,
  });
}

export function useForgotPassword(
  options?: Omit<
    UseMutationOptions<ForgotPasswordResponse, Error, ForgotPasswordDto>,
    'mutationFn'
  >,
) {
  return useMutation({
    mutationFn: (data: ForgotPasswordDto) => authApi.forgotPassword(data),
    ...options,
  });
}

export function useResetPassword(
  options?: Omit<
    UseMutationOptions<{ success: boolean }, Error, ResetPasswordPayload>,
    'mutationFn'
  >,
) {
  return useMutation({
    mutationFn: (data: ResetPasswordPayload) => authApi.resetPassword(data),
    ...options,
  });
}

export function useCheckUsername(username: string, options?: { enabled?: boolean }) {
  const cleanUsername = username.replace(/^@+/, '').trim().toLowerCase();
  const isEligible = Boolean(cleanUsername && cleanUsername.length >= 2);

  return useQuery({
    queryKey: queryKeys.auth.checkUsername(cleanUsername),
    queryFn: ({ signal }) => authApi.checkUsername(cleanUsername, { signal }),
    enabled: isEligible && (options?.enabled ?? true),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
