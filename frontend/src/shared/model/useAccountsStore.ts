import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedAccount {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string | null;
  accessToken: string;
  refreshToken: string;
}

export interface AccountsState {
  accounts: SavedAccount[];
  activeAccountId: string | null;

  upsertAccount: (account: SavedAccount) => void;

  switchAccount: (id: string) => SavedAccount | undefined;

  removeAccount: (id: string) => void;

  getActiveAccount: () => SavedAccount | undefined;
}

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set, get) => ({
      accounts: [],
      activeAccountId: null,

      upsertAccount: (account) =>
        set((state) => {
          const exists = state.accounts.some((a) => a.id === account.id);
          return {
            accounts: exists
              ? state.accounts.map((a) => (a.id === account.id ? { ...a, ...account } : a))
              : [...state.accounts, account],
            activeAccountId: account.id,
          };
        }),

      switchAccount: (id) => {
        const account = get().accounts.find((a) => a.id === id);
        if (!account) return undefined;

        localStorage.setItem('accessToken', account.accessToken);
        localStorage.setItem('refreshToken', account.refreshToken);
        set({ activeAccountId: id });
        return account;
      },

      removeAccount: (id) =>
        set((state) => {
          const accounts = state.accounts.filter((a) => a.id !== id);
          const activeAccountId =
            state.activeAccountId === id ? (accounts[0]?.id ?? null) : state.activeAccountId;
          return { accounts, activeAccountId };
        }),

      getActiveAccount: () => get().accounts.find((a) => a.id === get().activeAccountId),
    }),
    {
      name: 'eternal-accounts',
      partialize: (state) => ({ accounts: state.accounts, activeAccountId: state.activeAccountId }),
    },
  ),
);
