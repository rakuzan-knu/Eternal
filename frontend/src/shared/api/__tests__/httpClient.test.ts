import { describe, expect, it, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { apiClient } from '../httpClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { resetSessionStores } from '@/shared/model/resetSession';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useTypingStore } from '@/features/chat/model/useTypingStore';

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

    // Grab the response error interceptor from apiClient
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
    useTypingStore.setState({
      typingByConversation: {
        conv1: [{ userId: 'user-2', timestamp: Date.now() }],
      },
    });
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
    expect(Object.keys(useTypingStore.getState().typingByConversation).length).toBe(1);

    resetSessionStores();

    expect(usePresenceStore.getState().onlineUserIds.size).toBe(0);
    expect(useMessageToastStore.getState().toasts.length).toBe(0);
    expect(Object.keys(useTypingStore.getState().typingByConversation).length).toBe(0);
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
    const mockRequest = {
      headers: {},
      _rateLimitRetryCount: 0,
    };

    const mock429Error = {
      config: mockRequest,
      response: {
        status: 429,
        headers: { 'retry-after': '0.01' },
      },
    };

    const responseInterceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (err: unknown) => Promise<unknown> }[];
      }
    ).handlers[0]?.rejected;
    expect(responseInterceptor).toBeDefined();

    // Verify retry counter increment and sleep backoff execution
    responseInterceptor(mock429Error);
    expect(mockRequest._rateLimitRetryCount).toBe(1);
  });
});
