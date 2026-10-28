import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initCrossTabSync, notifyAuthChange, type AuthSyncEvent } from '../broadcastSync';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';

describe('broadcastSync', () => {
  let mockPostMessage: ReturnType<typeof vi.fn>;
  let messageHandler: ((event: MessageEvent<AuthSyncEvent>) => void) | null;

  beforeEach(() => {
    mockPostMessage = vi.fn();
    messageHandler = null;

    class MockBroadcastChannel {
      name: string;
      set onmessage(fn: (event: MessageEvent<AuthSyncEvent>) => void) {
        messageHandler = fn;
      }
      get onmessage() {
        return messageHandler!;
      }
      constructor(name: string) {
        this.name = name;
      }
      postMessage = mockPostMessage;
    }

    Object.defineProperty(window, 'BroadcastChannel', {
      value: MockBroadcastChannel,
      writable: true,
      configurable: true,
    });
    localStorage.clear();
  });

  it('notifyAuthChange posts message to channel', () => {
    notifyAuthChange('LOGOUT');
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'LOGOUT', payload: undefined });
  });

  it('initCrossTabSync handles LOGOUT event', () => {
    useAuthStore.setState({ userId: 'usr-1', isAuthenticated: true });
    initCrossTabSync();

    if (messageHandler) {
      messageHandler({ data: { type: 'LOGOUT' } } as MessageEvent<AuthSyncEvent>);
    }

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().userId).toBeNull();
  });

  it('initCrossTabSync handles ACCOUNT_SWITCHED event', () => {
    const switchAccountSpy = vi.spyOn(useAccountsStore.getState(), 'switchAccount');
    useAccountsStore.setState({ activeAccountId: 'acc-1' });
    initCrossTabSync();

    if (messageHandler) {
      messageHandler({
        data: { type: 'ACCOUNT_SWITCHED', payload: { accountId: 'acc-2' } },
      } as MessageEvent<AuthSyncEvent>);
    }

    expect(switchAccountSpy).toHaveBeenCalledWith('acc-2');
  });

  it('ignores a delayed logout from an older sign-in of the same account', () => {
    useAuthStore.setState({ userId: 'usr-1', isAuthenticated: true });
    localStorage.setItem('accessToken', 'new-sign-in');
    initCrossTabSync();
    messageHandler?.({
      data: { type: 'LOGOUT', payload: { userId: 'usr-1', previousAccessToken: 'old-sign-in' } },
    } as MessageEvent<AuthSyncEvent>);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('new-sign-in');
  });

  it('clears the matching session on a scoped logout', () => {
    useAuthStore.setState({ userId: 'usr-1', isAuthenticated: true });
    localStorage.setItem('accessToken', 'old-sign-in');
    initCrossTabSync();
    messageHandler?.({
      data: { type: 'LOGOUT', payload: { userId: 'usr-1', previousAccessToken: 'old-sign-in' } },
    } as MessageEvent<AuthSyncEvent>);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('initCrossTabSync handles TOKEN_REFRESH event for the same captured session', () => {
    useAuthStore.setState({ userId: 'acc-1', isAuthenticated: true });
    useAccountsStore.setState({
      activeAccountId: 'acc-1',
      accounts: [{ id: 'acc-1', username: 'alice' }],
    });
    localStorage.setItem('accessToken', 'old-access-token');
    initCrossTabSync();

    if (messageHandler) {
      messageHandler({
        data: {
          type: 'TOKEN_REFRESH',
          payload: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            session: {
              userId: 'acc-1',
              accountId: 'acc-1',
              previousAccessToken: 'old-access-token',
            },
          },
        },
      } as MessageEvent<AuthSyncEvent>);
    }

    expect(localStorage.getItem('accessToken')).toBe('new-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
  });

  it.each(['unbound legacy', 'different account', 'logged out', 'newer token'])(
    'ignores refresh from %s without replacing credentials',
    (scenario) => {
      useAuthStore.setState({ userId: 'alice', isAuthenticated: scenario !== 'logged out' });
      useAccountsStore.setState({ activeAccountId: 'alice', accounts: [] });
      localStorage.setItem('accessToken', scenario === 'newer token' ? 'newer' : 'current');
      localStorage.setItem('refreshToken', 'keep-refresh');
      initCrossTabSync();
      const expectedToken = localStorage.getItem('accessToken');
      messageHandler?.({
        data: {
          type: 'TOKEN_REFRESH',
          payload: {
            accessToken: 'stale-access',
            refreshToken: 'stale-refresh',
            ...(scenario === 'unbound legacy'
              ? {}
              : {
                  session: {
                    userId: scenario === 'different account' ? 'bob' : 'alice',
                    accountId: scenario === 'different account' ? 'bob' : 'alice',
                    previousAccessToken: 'current',
                  },
                }),
          },
        },
      } as MessageEvent<AuthSyncEvent>);
      expect(localStorage.getItem('accessToken')).toBe(expectedToken);
      expect(localStorage.getItem('refreshToken')).toBe('keep-refresh');
    },
  );

  it('handles null/invalid message data and unhandled events', () => {
    initCrossTabSync();
    expect(messageHandler).not.toBeNull();
    // @ts-expect-error test purpose
    messageHandler?.({ data: null });
    // @ts-expect-error test purpose
    messageHandler?.({ data: {} });
    // @ts-expect-error test purpose
    messageHandler?.({ data: { type: 'UNKNOWN_EVENT' } });
  });

  it('handles BroadcastChannel constructor throwing error', () => {
    Object.defineProperty(window, 'BroadcastChannel', {
      value: vi.fn().mockImplementation(() => {
        throw new Error('Not permitted');
      }),
      writable: true,
      configurable: true,
    });

    expect(() => notifyAuthChange('LOGOUT')).not.toThrow();
    expect(() => initCrossTabSync()).not.toThrow();
  });

  it('covers catch block (lines 19-20) when BroadcastChannel throws on fresh module', async () => {
    // Need a fresh module where channel === null so the constructor can be called (and throw)
    vi.resetModules();

    Object.defineProperty(window, 'BroadcastChannel', {
      value: vi.fn().mockImplementation(() => {
        throw new Error('SecurityError: Not permitted');
      }),
      writable: true,
      configurable: true,
    });

    const { notifyAuthChange: freshNotify, initCrossTabSync: freshInit } =
      await import('../broadcastSync');

    // These should not throw - catch sets channel to null
    expect(() => freshNotify('LOGOUT')).not.toThrow();
    expect(() => freshInit()).not.toThrow();
  });
});
