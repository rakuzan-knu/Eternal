import axios, { type InternalAxiosRequestConfig } from 'axios';
import { getServiceBaseUrl } from '@social-network/shared-api-client/service-routing';
import {
  useAccountsStore,
  type AccountsState,
  type SavedAccount,
} from '@/shared/model/useAccountsStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { notifyAuthChange } from '@/shared/lib/broadcastSync';

interface ExtendedRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _authSession?: SessionSnapshot;
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

const defaultBaseUrl =
  typeof window !== 'undefined' && import.meta.env.PROD ? '' : 'http://localhost:3000';

const configuredUrl = import.meta.env.VITE_API_URL;
const rawApiUrl = (
  configuredUrl !== undefined && configuredUrl !== '' ? configuredUrl : defaultBaseUrl
).trim();

const rawBaseUrl = rawApiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
const coreBaseUrl = rawBaseUrl
  ? rawBaseUrl.endsWith('/v1')
    ? rawBaseUrl
    : `${rawBaseUrl}/v1`
  : '/v1';

export const apiClient = axios.create({
  baseURL: coreBaseUrl,
  timeout: 30000,
  withCredentials: true,
});
const serviceOrigins = {
  messenger: import.meta.env.VITE_MESSENGER_API_URL ?? '',
  reels: import.meta.env.VITE_REELS_API_URL ?? '',
  music: import.meta.env.VITE_MUSIC_API_URL ?? '',
};

// Popup navigation and fetch callers need the same routing as Axios requests.
export function getApiUrl(path: string): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return path;
  const baseUrl = getServiceBaseUrl(path, serviceOrigins, coreBaseUrl).replace(/\/+$/, '');
  const relativePath = path
    .replace(/^\/+/, '')
    .replace(/^(?:api\/)?v1(?:\/|$)/, '')
    .replace(/^api(?:\/|$)/, '');
  return `${baseUrl}/${relativePath}`;
}

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

interface SessionSnapshot {
  revision: number;
  userId: string | null;
  authenticated: boolean;
  accountId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// A switch away and back must invalidate pending work even if the user IDs match again.
let sessionRevision = 0;
let sessionTrackingStarted = false;
function captureSession(): SessionSnapshot {
  // Stores import socket transport during initialization; subscribe after that cycle has settled.
  if (!sessionTrackingStarted) {
    sessionTrackingStarted = true;
    useAuthStore.subscribe((state, previous) => {
      if (state.userId !== previous.userId || state.isAuthenticated !== previous.isAuthenticated) {
        sessionRevision += 1;
      }
    });
    useAccountsStore.subscribe((state, previous) => {
      if (state.activeAccountId !== previous.activeAccountId) sessionRevision += 1;
    });
  }
  return {
    revision: sessionRevision,
    userId: useAuthStore.getState().userId,
    authenticated: useAuthStore.getState().isAuthenticated,
    accountId: useAccountsStore.getState().activeAccountId,
    accessToken: getStoredItem('accessToken'),
    refreshToken: getStoredItem('refreshToken'),
  };
}

const isSameIdentity = (session: SessionSnapshot): boolean => {
  const current = captureSession();
  return (
    current.revision === session.revision &&
    current.userId === session.userId &&
    current.authenticated === session.authenticated &&
    current.accountId === session.accountId
  );
};

const isSameSession = (session: SessionSnapshot): boolean =>
  isSameIdentity(session) &&
  getStoredItem('accessToken') === session.accessToken &&
  getStoredItem('refreshToken') === session.refreshToken;

const sessionChanged = () =>
  new axios.CanceledError('Session changed while the request was pending');
let pendingRefresh: { session: SessionSnapshot; promise: Promise<string> } | null = null;

async function refreshSession(session: SessionSnapshot): Promise<string> {
  const base = (apiClient.defaults.baseURL || '').replace(/\/+$/, '');
  const refreshUrl = base.endsWith('/v1') ? `${base}/auth/refresh` : `${base}/v1/auth/refresh`;
  const response = await axios.post<{ accessToken?: unknown; refreshToken?: unknown }>(
    refreshUrl,
    session.refreshToken ? { refreshToken: session.refreshToken } : {},
    { withCredentials: true },
  );
  if (!isSameSession(session)) throw sessionChanged();
  const { accessToken, refreshToken: newRefreshToken } = response.data;
  if (
    typeof accessToken !== 'string' ||
    !accessToken ||
    (newRefreshToken !== undefined && typeof newRefreshToken !== 'string')
  ) {
    throw new Error('Invalid token refresh response');
  }
  setStoredItem('accessToken', accessToken);
  if (newRefreshToken) setStoredItem('refreshToken', newRefreshToken);
  notifyAuthChange('TOKEN_REFRESH', {
    accessToken,
    refreshToken: newRefreshToken,
    session: {
      userId: session.userId,
      accountId: session.accountId,
      previousAccessToken: session.accessToken,
    },
  });
  if (session.accountId) {
    useAccountsStore.setState((state: AccountsState) => ({
      accounts: state.accounts.map((a: SavedAccount) =>
        a.id === session.accountId
          ? { ...a, accessToken, refreshToken: newRefreshToken ?? a.refreshToken }
          : a,
      ),
    }));
  }
  return accessToken;
}

export function requestTokenRefresh(): Promise<string> {
  const session = captureSession();
  if (pendingRefresh && isSameSession(pendingRefresh.session)) return pendingRefresh.promise;
  const pending = {
    session,
    promise: refreshSession(session).finally(() => {
      // An old account's completion must not release the new account's mutex.
      if (pendingRefresh === pending) pendingRefresh = null;
    }),
  };
  pendingRefresh = pending;
  return pending.promise;
}

export async function getValidAccessToken(): Promise<string | null> {
  const token = getStoredItem('accessToken');
  if (token && !isTokenExpired(token)) {
    return token;
  }
  const refreshToken = getStoredItem('refreshToken');
  const isAuth = useAuthStore.getState().isAuthenticated;
  if (!refreshToken && !isAuth) return null;

  try {
    return await requestTokenRefresh();
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use(async (config: ExtendedRequestConfig) => {
  const session = config._authSession ?? captureSession();
  if (!isSameIdentity(session)) throw sessionChanged();
  config.baseURL = getServiceBaseUrl(config.url ?? '', serviceOrigins, coreBaseUrl);
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
  if (token && isTokenExpired(token)) {
    const freshToken = await getValidAccessToken();
    if (freshToken) {
      token = freshToken;
    }
  }

  if (!isSameIdentity(session)) throw sessionChanged();
  config._authSession = captureSession();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const session = (response.config as ExtendedRequestConfig | undefined)?._authSession;
    if (session && !isSameIdentity(session)) throw sessionChanged();
    return response;
  },
  async (error) => {
    const originalRequest = error.config as ExtendedRequestConfig | undefined;

    if (originalRequest?._authSession && !isSameIdentity(originalRequest._authSession)) {
      return Promise.reject(sessionChanged());
    }

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

    // Refresh only resource requests; rejected sign-in credentials are not session expiry.
    const isAuthRequest = /\/auth\/(?:login|register|refresh)(?:[/?]|$)/.test(
      originalRequest?.url ?? '',
    );
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;
      const session = originalRequest._authSession ?? captureSession();
      if (!isSameIdentity(session)) return Promise.reject(sessionChanged());
      try {
        const currentToken = getStoredItem('accessToken');
        // Another request may have refreshed this identity while its old request was in flight.
        const accessToken =
          currentToken && currentToken !== session.accessToken && !isTokenExpired(currentToken)
            ? currentToken
            : await requestTokenRefresh();
        if (!isSameIdentity(session)) throw sessionChanged();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Offline, rate limits and server outages are recoverable; they do not revoke auth.
        if (
          axios.isAxiosError(refreshError) &&
          refreshError.response?.status === 401 &&
          isSameSession(session)
        ) {
          if (session.accountId) useAccountsStore.getState().removeAccount(session.accountId);
          useAuthStore.getState().clearAuth();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
