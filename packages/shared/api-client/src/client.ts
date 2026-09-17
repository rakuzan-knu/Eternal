import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

export interface ApiClientOptions {
  baseURL: string;
  getToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
  timeout?: number;
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000 - 15000;
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

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    // Inject correlation ID if available in browser
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      config.headers.set('x-correlation-id', crypto.randomUUID());
    }

    if (options.getToken) {
      const token = await options.getToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error?.response?.status === 401 && options.onUnauthorized) {
        options.onUnauthorized();
      }
      return Promise.reject(error);
    },
  );

  return client;
}
