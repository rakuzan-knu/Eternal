import { Platform } from 'react-native';
import { createApiClient, setApiClient } from '@social-network/shared-api-client';
import { useAuthStore } from '@social-network/shared-stores';
import { onlineManager } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';

const origin = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
)
  .trim()
  .replace(/\/+$/, '');

let active:
  { userId: string | undefined; refreshToken: string | null; client: AxiosInstance } | undefined;

export function getMobileApi(): AxiosInstance {
  const current = useAuthStore.getState();
  const userId = current.user?.id;
  if (active && active.userId === userId && active.refreshToken === current.refreshToken)
    return active.client;
  let expectedRefreshToken = current.refreshToken;
  const isCurrentSession = () => {
    const session = useAuthStore.getState();
    return session.user?.id === userId && session.refreshToken === expectedRefreshToken;
  };
  const client = createApiClient({
    baseURL: origin.endsWith('/v1') ? origin : `${origin}/v1`,
    getToken: () => {
      if (!isCurrentSession()) throw new Error('The account session changed');
      if (!onlineManager.isOnline()) throw new Error('An internet connection is required');
      return useAuthStore.getState().accessToken;
    },
    getRefreshToken: () => {
      if (!isCurrentSession()) throw new Error('The account session changed');
      return useAuthStore.getState().refreshToken;
    },
    onTokenRefreshed: ({ accessToken, refreshToken }) => {
      const session = useAuthStore.getState();
      if (isCurrentSession() && session.user && session.isAuthenticated) {
        expectedRefreshToken = refreshToken ?? session.refreshToken;
        session.setSession({
          user: session.user,
          accessToken,
          refreshToken: expectedRefreshToken,
        });
      } else {
        throw new Error('The account session changed during token refresh');
      }
    },
    onUnauthorized: () => {
      if (isCurrentSession()) useAuthStore.getState().clearSession();
    },
  });
  active = { userId, refreshToken: current.refreshToken, client };
  setApiClient(client);
  return client;
}

// Also configure the shared auth hooks before the first login request.
getMobileApi();

export function assertSession(userId: string, refreshToken: string | null) {
  const session = useAuthStore.getState();
  if (
    !session.isAuthenticated ||
    session.user?.id !== userId ||
    session.refreshToken !== refreshToken
  )
    throw new Error('The account session changed');
  if (!onlineManager.isOnline()) throw new Error('An internet connection is required');
}

export const webOrigin = (process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173')
  .trim()
  .replace(/\/+$/, '');
