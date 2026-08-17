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

  it('initCrossTabSync handles TOKEN_REFRESH event', () => {
    initCrossTabSync();

    if (messageHandler) {
      messageHandler({
        data: {
          type: 'TOKEN_REFRESH',
          payload: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' },
        },
      } as MessageEvent<AuthSyncEvent>);
    }

    expect(localStorage.getItem('accessToken')).toBe('new-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
  });
});
