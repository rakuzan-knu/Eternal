import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  useAccountsStore,
  type AccountsState,
  type SavedAccount,
} from '@/shared/model/useAccountsStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { notifyAuthChange } from '@/shared/lib/broadcastSync';

interface ExtendedRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _rateLimitRetryCount?: number;
}

const MAX_429_RETRIES = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getStoredItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    return null;
  }
  return null;
};

const setStoredItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
};

const rawBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
  .replace(/\/api\/?$/, '')
  .replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: rawBaseUrl.endsWith('/v1') ? rawBaseUrl : `${rawBaseUrl}/v1`,
  timeout: 30000,
  withCredentials: true,
});

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(jsonPayload);
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() + 15000;
  } catch {
    return false;
  }
}

let refreshPromise: Promise<string> | null = null;

export async function requestTokenRefresh(): Promise<string> {
  const refreshToken = getStoredItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token available');

  const base = (apiClient.defaults.baseURL || '').replace(/\/+$/, '');
  const refreshUrl = base.endsWith('/v1') ? `${base}/auth/refresh` : `${base}/v1/auth/refresh`;
  const response = await axios.post(refreshUrl, {
    refreshToken,
  });
  const { accessToken, refreshToken: newRefreshToken } = response.data;
  setStoredItem('accessToken', accessToken);
  if (newRefreshToken) setStoredItem('refreshToken', newRefreshToken);

  notifyAuthChange('TOKEN_REFRESH', { accessToken, refreshToken: newRefreshToken });

  const activeId = useAccountsStore.getState().activeAccountId;
  if (activeId) {
    useAccountsStore.setState((state: AccountsState) => ({
      accounts: state.accounts.map((a: SavedAccount) =>
        a.id === activeId
          ? { ...a, accessToken, refreshToken: newRefreshToken ?? a.refreshToken }
          : a,
      ),
    }));
  }

  return accessToken;
}

export async function getValidAccessToken(): Promise<string | null> {
  const token = getStoredItem('accessToken');
  if (token && !isTokenExpired(token)) {
    return token;
  }
  const refreshToken = getStoredItem('refreshToken');
  if (!refreshToken) return null;

  try {
    if (!refreshPromise) {
      refreshPromise = requestTokenRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    return await refreshPromise;
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use(async (config) => {
  // Since baseURL already ends with /v1, strip any redundant /v1 prefix from config.url
  if (config.url && !config.url.startsWith('http://') && !config.url.startsWith('https://')) {
    if (config.url.startsWith('/v1/')) {
      config.url = config.url.slice(3);
    } else if (config.url.startsWith('v1/')) {
      config.url = config.url.slice(2);
    } else if (config.url === '/v1' || config.url === 'v1') {
      config.url = '/';
    }
  }

  const method = (config.method || '').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && config.headers) {
    if (!config.headers['X-Idempotency-Key'] && !config.headers['x-idempotency-key']) {
      const idempotencyKey =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      config.headers['X-Idempotency-Key'] = idempotencyKey;
    }
  }

  if (config.url?.includes('/auth/refresh')) {
    return config;
  }

  let token = getStoredItem('accessToken');
  if (token && isTokenExpired(token) && getStoredItem('refreshToken')) {
    const freshToken = await getValidAccessToken();
    if (freshToken) {
      token = freshToken;
    }
  }

  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as ExtendedRequestConfig | undefined;

    // 1. Handle 429 Too Many Requests with exponential backoff & jitter
    if (error.response?.status === 429 && originalRequest) {
      const retryCount = (originalRequest._rateLimitRetryCount || 0) + 1;
      if (retryCount <= MAX_429_RETRIES) {
        originalRequest._rateLimitRetryCount = retryCount;

        const retryAfterHeader = error.response.headers?.['retry-after'];
        const retryAfterSec = retryAfterHeader ? parseFloat(retryAfterHeader) : 1;
        const delayMs =
          (isNaN(retryAfterSec) ? 1 : retryAfterSec) * 1000 +
          Math.pow(2, retryCount) * 100 +
          Math.random() * 150;

        await sleep(delayMs);
        return apiClient(originalRequest);
      }
    }

    // 2. Handle 401 Unauthorized with token refresh mutex
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = requestTokenRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const accessToken = await refreshPromise;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        const activeId = useAccountsStore.getState().activeAccountId;
        if (activeId) {
          useAccountsStore.getState().removeAccount(activeId);
        }
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
