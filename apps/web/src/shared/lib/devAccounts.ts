import { useAccountsStore, type SavedAccount } from '@/shared/model/useAccountsStore';

export async function ensureDevAccounts(): Promise<void> {
  if (!import.meta.env.DEV) return;

  const currentAccounts = useAccountsStore.getState().accounts;
  const currentToken = localStorage.getItem('accessToken');
  if (currentToken && currentAccounts.length >= 1) {
    return;
  }

  const baseApi = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
    .replace(/\/v1\/?$/, '')
    .replace(/\/+$/, '');
  const apiUrl = `${baseApi}/v1`;

  try {
    const [res1, res2] = await Promise.all([
      fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user1@example.com', password: 'Password123!' }),
      }),
      fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user2@example.com', password: 'Password123!' }),
      }),
    ]);

    if (!res1.ok || !res2.ok) return;

    const data1 = (await res1.json()) as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; username: string; displayName?: string; avatar?: string | null };
    };
    const data2 = (await res2.json()) as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; username: string; displayName?: string; avatar?: string | null };
    };

    const acc1: SavedAccount = {
      id: data1.user.id,
      username: data1.user.username,
      displayName: data1.user.displayName,
      avatar: data1.user.avatar ?? null,
      accessToken: data1.accessToken,
      refreshToken: data1.refreshToken,
    };

    const acc2: SavedAccount = {
      id: data2.user.id,
      username: data2.user.username,
      displayName: data2.user.displayName,
      avatar: data2.user.avatar ?? null,
      accessToken: data2.accessToken,
      refreshToken: data2.refreshToken,
    };

    const initialActiveId = useAccountsStore.getState().activeAccountId;
    useAccountsStore.getState().upsertAccount(acc2);
    useAccountsStore.getState().upsertAccount(acc1);

    if (initialActiveId) {
      useAccountsStore.setState({ activeAccountId: initialActiveId });
    } else if (!localStorage.getItem('accessToken')) {
      useAccountsStore.getState().switchAccount(acc1.id);
    }
  } catch (err) {
    console.warn('[DEV] Failed to auto-login dev accounts:', err);
  }
}
