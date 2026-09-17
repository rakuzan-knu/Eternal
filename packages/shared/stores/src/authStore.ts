import { create } from 'zustand';

export interface UserSessionProfile {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  email?: string;
  role?: string;
}

export interface AuthState {
  accessToken: string | null;
  user: UserSessionProfile | null;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: UserSessionProfile) => void;
  setAccessToken: (token: string | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  setSession: (accessToken, user) =>
    set({
      accessToken,
      user,
      isAuthenticated: true,
    }),
  setAccessToken: (accessToken) =>
    set((state) => ({
      accessToken,
      isAuthenticated: Boolean(accessToken && state.user),
    })),
  clearSession: () =>
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    }),
}));
