import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { resetSessionStores } from './resetSession';
import { notifyAuthChange } from '@/shared/lib/broadcastSync';

interface AuthState {
  userId: string | null;
  isAuthenticated: boolean;
  setAuth: (userId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      isAuthenticated: false,
      setAuth: (userId) => set({ userId, isAuthenticated: true }),
      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ userId: null, isAuthenticated: false });
        resetSessionStores();
        notifyAuthChange('LOGOUT');
      },
    }),
    {
      name: 'auth-session',
    },
  ),
);
