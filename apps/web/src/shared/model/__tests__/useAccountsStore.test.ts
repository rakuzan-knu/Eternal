import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAccountsStore, SavedAccount } from '../useAccountsStore';
import { useAuthStore } from '../useAuthStore';

vi.mock('@/shared/lib/broadcastSync', () => ({
  notifyAuthChange: vi.fn(),
  listenAuthChange: vi.fn(() => vi.fn()),
}));

describe('useAccountsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAccountsStore.setState({ accounts: [], activeAccountId: null });
    useAuthStore.setState({ userId: null, isAuthenticated: false });
  });

  it('upserts accounts correctly', () => {
    const acc1: SavedAccount = {
      id: 'acc-1',
      username: 'john_doe',
      accessToken: 'token-1',
      refreshToken: 'refresh-1',
    };
    const acc2: SavedAccount = {
      id: 'acc-2',
      username: 'jane_doe',
      accessToken: 'token-2',
      refreshToken: 'refresh-2',
    };

    useAccountsStore.getState().upsertAccount(acc1);
    useAccountsStore.getState().upsertAccount(acc2);
    expect(useAccountsStore.getState().accounts).toHaveLength(2);
    expect(useAccountsStore.getState().activeAccountId).toBe('acc-2');

    // Update existing account when other accounts exist in array
    useAccountsStore.getState().upsertAccount({
      ...acc1,
      displayName: 'John Doe',
    });
    expect(useAccountsStore.getState().accounts).toHaveLength(2);
    expect(useAccountsStore.getState().accounts[0].displayName).toBe('John Doe');
    expect(useAccountsStore.getState().accounts[1].username).toBe('jane_doe');
  });

  it('switches active account and updates auth store + localStorage', () => {
    const acc1: SavedAccount = {
      id: 'acc-1',
      username: 'john',
      accessToken: 'token-1',
      refreshToken: 'refresh-1',
    };
    const acc2: SavedAccount = {
      id: 'acc-2',
      username: 'jane',
      accessToken: 'token-2',
      refreshToken: 'refresh-2',
    };

    useAccountsStore.getState().upsertAccount(acc1);
    useAccountsStore.getState().upsertAccount(acc2);

    const switched = useAccountsStore.getState().switchAccount('acc-1');
    expect(switched).toEqual(acc1);
    expect(useAccountsStore.getState().activeAccountId).toBe('acc-1');
    expect(localStorage.getItem('accessToken')).toBe('token-1');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-1');
    expect(useAuthStore.getState().userId).toBe('acc-1');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Switch to non-existent account returns undefined
    const nonExistent = useAccountsStore.getState().switchAccount('unknown');
    expect(nonExistent).toBeUndefined();
  });

  it('removes account and falls back active account if removed was active', () => {
    const acc1: SavedAccount = {
      id: 'acc-1',
      username: 'john',
      accessToken: 't1',
      refreshToken: 'r1',
    };
    const acc2: SavedAccount = {
      id: 'acc-2',
      username: 'jane',
      accessToken: 't2',
      refreshToken: 'r2',
    };

    useAccountsStore.getState().upsertAccount(acc1);
    useAccountsStore.getState().upsertAccount(acc2);
    useAccountsStore.getState().switchAccount('acc-2');

    useAccountsStore.getState().removeAccount('acc-2');
    expect(useAccountsStore.getState().accounts).toHaveLength(1);
    expect(useAccountsStore.getState().activeAccountId).toBe('acc-1');

    useAccountsStore.getState().removeAccount('acc-1');
    expect(useAccountsStore.getState().accounts).toHaveLength(0);
    expect(useAccountsStore.getState().activeAccountId).toBeNull();
  });
});
