import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'purchase';
  amount: number;
  description: string;
  timestamp: number;
}

export interface ShopWalletState {
  balance: number;
  transactions: WalletTransaction[];
  addFunds: (amount: number, methodTitle?: string) => void;
  deductFunds: (amount: number, description?: string) => boolean;
  resetWallet: () => void;
}

// Clean up legacy test balance from previous development sessions
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const legacyKey = 'eternal_shop_wallet_storage';
    if (localStorage.getItem(legacyKey)) {
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // Ignore storage access errors
  }
}

export const useShopWalletStore = create<ShopWalletState>()(
  persist(
    (set, get) => ({
      balance: 0.0,
      transactions: [],
      addFunds: (amount: number, methodTitle = 'Card Deposit') => {
        const current = get().balance;
        const newBalance = Math.round((current + amount) * 100) / 100;
        const newTx: WalletTransaction = {
          id: `tx-${Date.now()}`,
          type: 'deposit',
          amount,
          description: `Top-up via ${methodTitle}`,
          timestamp: Date.now(),
        };
        set({
          balance: newBalance,
          transactions: [newTx, ...get().transactions].slice(0, 20),
        });
      },
      deductFunds: (amount: number, description = 'Shop Purchase') => {
        const current = get().balance;
        if (current < amount) return false;
        const newBalance = Math.round((current - amount) * 100) / 100;
        const newTx: WalletTransaction = {
          id: `tx-${Date.now()}`,
          type: 'purchase',
          amount,
          description,
          timestamp: Date.now(),
        };
        set({
          balance: newBalance,
          transactions: [newTx, ...get().transactions].slice(0, 20),
        });
        return true;
      },
      resetWallet: () => {
        set({ balance: 0.0, transactions: [] });
      },
    }),
    {
      name: 'eternal_shop_wallet_v2',
    },
  ),
);
