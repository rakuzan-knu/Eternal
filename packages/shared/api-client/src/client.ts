import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

export interface ExtendedRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _rateLimitRetryCount?: number;
}

export interface ApiClientOptions {
  baseURL: string;
  getToken?: () => string | null | Promise<string | null>;
  getRefreshToken?: () => string | null | Promise<string | null>;
  onTokenRefreshed?: (tokens: {
    accessToken: string;
    refreshToken?: string | undefined;
  }) => void | Promise<void>;
  onUnauthorized?: () => void | Promise<void>;
  timeout?: number;
}

const MAX_429_RETRIES = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return false;
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

export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 30000,
    withCredentials: true,
  });

  let refreshPromise: Promise<string> | null = null;

  async function requestTokenRefresh(): Promise<string> {
    if (!options.getRefreshToken) {
      throw new Error('No refreshToken provider configured');
    }
    const refreshToken = await options.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const base = (client.defaults.baseURL || '').replace(/\/+$/, '');
    const refreshUrl = base.endsWith('/v1') ? `${base}/auth/refresh` : `${base}/v1/auth/refresh`;

    const response = await axios.post<{ accessToken: string; refreshToken?: string }>(refreshUrl, {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    if (options.onTokenRefreshed) {
      await options.onTokenRefreshed({
        accessToken,
        ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}),
      });
    }

    return accessToken;
  }

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (config.url && !config.url.startsWith('http://') && !config.url.startsWith('https://')) {
      if (config.url.startsWith('/v1/')) {
        config.url = config.url.slice(3);
      } else if (config.url.startsWith('v1/')) {
        config.url = config.url.slice(2);
      }
    }

    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      config.headers.set('x-correlation-id', crypto.randomUUID());
    }

    const method = (config.method || '').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (!config.headers.get('X-Idempotency-Key') && !config.headers.get('x-idempotency-key')) {
        const idempotencyKey =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        config.headers.set('X-Idempotency-Key', idempotencyKey);
      }
    }

    if (config.url?.includes('/auth/refresh')) {
      return config;
    }

    if (options.getToken) {
      let token = await options.getToken();
      if (token && isTokenExpired(token) && options.getRefreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = requestTokenRefresh().finally(() => {
              refreshPromise = null;
            });
          }
          token = await refreshPromise;
        } catch {
          // Keep current token or proceed to let interceptor catch 401
        }
      }

      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as ExtendedRequestConfig | undefined;

      // 1. Handle 429 Too Many Requests
      if (error?.response?.status === 429 && originalRequest) {
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
          return client(originalRequest);
        }
      }

      // 2. Handle 401 Unauthorized with token refresh mutex
      if (
        error?.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        options.getRefreshToken
      ) {
        originalRequest._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = requestTokenRefresh().finally(() => {
              refreshPromise = null;
            });
          }
          const freshToken = await refreshPromise;
          originalRequest.headers.set('Authorization', `Bearer ${freshToken}`);
          return client(originalRequest);
        } catch (refreshErr) {
          if (options.onUnauthorized) {
            await options.onUnauthorized();
          }
          return Promise.reject(refreshErr);
        }
      }

      if (error?.response?.status === 401 && options.onUnauthorized) {
        await options.onUnauthorized();
      }

      return Promise.reject(error);
    },
  );

  return client;
}
