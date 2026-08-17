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

export const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3000')
    .replace(/\/api\/?$/, '')
    .replace(/\/+$/, ''),
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function requestTokenRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token available');

  const base = (apiClient.defaults.baseURL || '').replace(/\/+$/, '');
  const response = await axios.post(`${base}/auth/refresh`, {
    refreshToken,
  });
  const { accessToken, refreshToken: newRefreshToken } = response.data;
  localStorage.setItem('accessToken', accessToken);
  if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

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
