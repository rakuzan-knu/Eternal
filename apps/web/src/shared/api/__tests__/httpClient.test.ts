import { describe, expect, it, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { apiClient } from '../httpClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { resetSessionStores, registerSessionResetHandler } from '@/shared/model/resetSession';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
    },
  };
});

describe('httpClient and session management', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearAuth();
    useAccountsStore.setState({ accounts: [], activeAccountId: null });
    vi.clearAllMocks();
  });

  it('adds Authorization header in request interceptor if token exists', async () => {
    localStorage.setItem('accessToken', 'my-token');
    const reqInterceptor = (
      apiClient.interceptors.request as unknown as {
        handlers: { fulfilled: (config: any) => any }[];
      }
    ).handlers[0]?.fulfilled;

    const config = { headers: {} };
    const result = await reqInterceptor(config);
    expect(result.headers.Authorization).toBe('Bearer my-token');
  });

  it('refreshes token successfully on 401 error and retries original request', async () => {
    localStorage.setItem('accessToken', 'old-access-token');
    localStorage.setItem('refreshToken', 'old-refresh-token');
    useAccountsStore.setState({
      accounts: [
        {
          id: 'acc-1',
          username: 'alice',
          accessToken: 'old-access-token',
          refreshToken: 'old-refresh-token',
        },
      ],
      activeAccountId: 'acc-1',
    });

    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    });

    const mock401Error = {
      config: { headers: {} as Record<string, string>, _retry: false },
      response: { status: 401 },
    };

    const responseInterceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: {
          fulfilled: (res: any) => any;
          rejected: (err: unknown) => Promise<unknown>;
        }[];
      }
    ).handlers[0];

    // Test fulfilled pass-through
    expect(responseInterceptor.fulfilled({ data: 'ok' })).toEqual({ data: 'ok' });

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = vi.fn().mockImplementation(async (config: any) => ({
      data: 'success',
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));

    const retryResult = (await responseInterceptor.rejected(mock401Error)) as any;
    expect(localStorage.getItem('accessToken')).toBe('new-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
    expect(useAccountsStore.getState().accounts[0].accessToken).toBe('new-access-token');
    expect(mock401Error.config.headers['Authorization']).toBe('Bearer new-access-token');
    expect(retryResult.data).toBe('success');

    apiClient.defaults.adapter = originalAdapter;
  });

  it('clears auth state and local tokens when token refresh fails on 401', async () => {
    localStorage.setItem('accessToken', 'expired-access-token');
    localStorage.setItem('refreshToken', 'expired-refresh-token');
    useAuthStore.getState().setAuth('user-1');

    useAccountsStore.getState().upsertAccount({
      id: 'user-1',
      username: 'testuser',
      accessToken: 'expired-access-token',
      refreshToken: 'expired-refresh-token',
    });

    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Refresh token invalid'));

    const mock401Error = {
      config: { headers: {}, _retry: false },
      response: { status: 401 },
    };

    const responseInterceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (err: unknown) => Promise<unknown> }[];
      }
    ).handlers[0]?.rejected;
    expect(responseInterceptor).toBeDefined();

    await expect(responseInterceptor(mock401Error)).rejects.toThrow('Refresh token invalid');

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().userId).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('resetSessionStores clears ephemeral in-memory state cleanly', () => {
    usePresenceStore.setState({ onlineUserIds: new Set(['user-1', 'user-2']) });
    const customReset = vi.fn();
    registerSessionResetHandler(customReset);
    useMessageToastStore.getState().addToast({
      id: 't-1',
      conversationId: 'conv1',
      messageId: 'msg1',
      title: 'New Message',
      body: 'Hello',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });

    expect(usePresenceStore.getState().onlineUserIds.size).toBe(2);
    expect(useMessageToastStore.getState().toasts.length).toBe(1);

    resetSessionStores();

    expect(usePresenceStore.getState().onlineUserIds.size).toBe(0);
    expect(useMessageToastStore.getState().toasts.length).toBe(0);
    expect(customReset).toHaveBeenCalled();
  });

  it('switchAccount atomically switches tokens, updates authStore and resets session stores', () => {
    useAccountsStore.setState({
      accounts: [
        {
          id: 'user-1',
          username: 'account1',
          accessToken: 'token-1',
          refreshToken: 'refresh-1',
        },
        {
          id: 'user-2',
          username: 'account2',
          accessToken: 'token-2',
          refreshToken: 'refresh-2',
        },
      ],
      activeAccountId: 'user-1',
    });

    useAuthStore.getState().setAuth('user-1');
    usePresenceStore.setState({ onlineUserIds: new Set(['user-1']) });

    const switched = useAccountsStore.getState().switchAccount('user-2');

    expect(switched).toBeDefined();
    expect(useAccountsStore.getState().activeAccountId).toBe('user-2');
    expect(useAuthStore.getState().userId).toBe('user-2');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('token-2');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-2');
    expect(usePresenceStore.getState().onlineUserIds.size).toBe(0);
  });

  it('handles 429 status by honoring Retry-After and retrying request', async () => {
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = vi.fn().mockResolvedValue({ status: 200, data: 'ok' });

    const mockRequest = {
      headers: {},
      _rateLimitRetryCount: 0,
    };

    const mock429Error = {
      config: mockRequest,
      response: {
        status: 429,
        headers: { 'retry-after': '0.001' },
      },
    };

    const responseInterceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (err: unknown) => Promise<unknown> }[];
      }
    ).handlers[0]?.rejected;
    expect(responseInterceptor).toBeDefined();

    const promise = responseInterceptor(mock429Error);
    expect(mockRequest._rateLimitRetryCount).toBe(1);
    await promise;

    apiClient.defaults.adapter = originalAdapter;
  });

  it('preserves other saved accounts when refreshing token for active account', async () => {
    localStorage.setItem('refreshToken', 'my-refresh-token');
    useAccountsStore.setState({
      accounts: [
        { id: 'acc-active', username: 'alice', accessToken: 'a1', refreshToken: 'r1' },
        { id: 'acc-other', username: 'bob', accessToken: 'a2', refreshToken: 'r2' },
      ],
      activeAccountId: 'acc-active',
    });

    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { accessToken: 'new-a1', refreshToken: 'new-r1' },
    });

    const mock401Error = {
      config: { headers: {} as Record<string, string>, _retry: false },
      response: { status: 401 },
    };

    const responseInterceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (err: unknown) => Promise<unknown> }[];
      }
    ).handlers[0]?.rejected;

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = vi.fn().mockResolvedValue({ status: 200, data: 'ok' });

    await responseInterceptor(mock401Error);

    const accounts = useAccountsStore.getState().accounts;
    expect(accounts.find((a) => a.id === 'acc-active')?.accessToken).toBe('new-a1');
    expect(accounts.find((a) => a.id === 'acc-other')?.accessToken).toBe('a2');

    apiClient.defaults.adapter = originalAdapter;
  });

  it('completes 429 retry and returns response', async () => {
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = vi.fn().mockResolvedValue({ status: 200, data: 'retried-ok' });

    const mockRequest = {
      headers: {},
      _rateLimitRetryCount: 0,
    };

    const mock429Error = {
      config: mockRequest,
      response: {
        status: 429,
        headers: { 'retry-after': '0.001' },
      },
    };

    const responseInterceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (err: unknown) => Promise<unknown> }[];
      }
    ).handlers[0]?.rejected;

    const res = (await responseInterceptor(mock429Error)) as any;
    expect(res.data).toBe('retried-ok');

    apiClient.defaults.adapter = originalAdapter;
  });

  it('rejects generic errors directly', async () => {
    const genericError = {
      response: { status: 500 },
    };

    const responseInterceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (err: unknown) => Promise<unknown> }[];
      }
    ).handlers[0]?.rejected;

    await expect(responseInterceptor(genericError)).rejects.toEqual(genericError);
  });

  it('covers line 43 - no newRefreshToken in response (only updates accessToken)', async () => {
    localStorage.setItem('accessToken', 'old-token');
    localStorage.setItem('refreshToken', 'old-refresh');
    useAccountsStore.setState({
      accounts: [
        { id: 'acc-1', username: 'alice', accessToken: 'old-token', refreshToken: 'old-refresh' },
      ],
      activeAccountId: 'acc-1',
    });

    // Response without refreshToken - covers the `if (newRefreshToken)` false branch (line 43)
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { accessToken: 'new-access-only' }, // no refreshToken
    });

    const mock401Error = {
      config: { headers: {} as Record<string, string>, _retry: false },
      response: { status: 401 },
    };

    const responseInterceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (err: unknown) => Promise<unknown> }[];
      }
    ).handlers[0]?.rejected;

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = vi.fn().mockResolvedValue({ status: 200, data: 'ok' });

    await responseInterceptor(mock401Error);

    expect(localStorage.getItem('accessToken')).toBe('new-access-only');
    // refreshToken should NOT be overwritten since newRefreshToken was falsy
    expect(localStorage.getItem('refreshToken')).toBe('old-refresh');

    apiClient.defaults.adapter = originalAdapter;
  });

  it('covers line 53 (the non-matching account else branch) and lines 80-81 (fully awaited 429 retry)', async () => {
    vi.useFakeTimers();

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = vi.fn().mockResolvedValue({ status: 200, data: '429-retried-ok' });

    const mockRequest = {
      headers: {},
      _rateLimitRetryCount: 0,
    };

    const mock429Error = {
      config: mockRequest,
      response: {
        status: 429,
        headers: { 'retry-after': 'NaN' }, // NaN header triggers isNaN branch (line 75)
      },
    };

    const responseInterceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (err: unknown) => Promise<unknown> }[];
      }
    ).handlers[0]?.rejected;

    const retryPromise = responseInterceptor(mock429Error) as Promise<any>;

    // Advance timers to cover the sleep delay (lines 80: await sleep(delayMs))
    await vi.runAllTimersAsync();

    const res = await retryPromise;
    expect(res.data).toBe('429-retried-ok'); // covers line 81: return apiClient(originalRequest)

    apiClient.defaults.adapter = originalAdapter;
    vi.useRealTimers();
  });
});
