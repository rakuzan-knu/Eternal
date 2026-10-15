import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClientOptions } from '@social-network/shared-api-client';

const mocks = vi.hoisted(() => ({
  options: [] as ApiClientOptions[],
  session: {
    user: { id: 'alice', username: 'alice' },
    accessToken: 'access-a',
    refreshToken: 'refresh-a',
    isAuthenticated: true,
    setSession: vi.fn(),
    clearSession: vi.fn(),
  },
  online: true,
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('@social-network/shared-stores', () => ({
  useAuthStore: { getState: () => mocks.session },
}));
vi.mock('@tanstack/react-query', () => ({ onlineManager: { isOnline: () => mocks.online } }));
vi.mock('@social-network/shared-api-client', () => ({
  createApiClient: (options: ApiClientOptions) => {
    mocks.options.push(options);
    return {};
  },
  setApiClient: vi.fn(),
}));

describe('mobile session boundaries', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.options.length = 0;
    mocks.session.user = { id: 'alice', username: 'alice' };
    mocks.session.accessToken = 'access-a';
    mocks.session.refreshToken = 'refresh-a';
    mocks.session.isAuthenticated = true;
    mocks.online = true;
  });
  it('uses versioned API routes and native session tokens', async () => {
    await import('./client');
    expect(mocks.options[0]?.baseURL).toBe('http://10.0.2.2:3000/v1');
    expect(await mocks.options[0]?.getToken?.()).toBe('access-a');
    expect(await mocks.options[0]?.getRefreshToken?.()).toBe('refresh-a');
  });
  it('creates a separate refresh client after an account switch', async () => {
    const { getMobileApi } = await import('./client');
    const first = getMobileApi();
    expect(getMobileApi()).toBe(first);
    mocks.session.user = { id: 'bob', username: 'bob' };
    mocks.session.refreshToken = 'refresh-b';
    expect(getMobileApi()).not.toBe(first);
    expect(() => mocks.options[0]?.getToken?.()).toThrow('session changed');
  });
  it('does not overwrite or sign out a new session after a stale refresh', async () => {
    await import('./client');
    const old = mocks.options[0];
    mocks.session.refreshToken = 'new-login-for-same-user';
    expect(() => old?.onTokenRefreshed?.({ accessToken: 'stale-token' })).toThrow(
      'session changed',
    );
    old?.onUnauthorized?.();
    expect(mocks.session.setSession).not.toHaveBeenCalled();
    expect(mocks.session.clearSession).not.toHaveBeenCalled();
  });
  it('persists rotated tokens for the current session and rejects offline submissions', async () => {
    const { assertSession } = await import('./client');
    mocks.options[0]?.onTokenRefreshed?.({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    expect(mocks.session.setSession).toHaveBeenCalledWith({
      user: mocks.session.user,
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    mocks.online = false;
    expect(() => assertSession('alice', 'refresh-a')).toThrow('internet connection');
  });
});
