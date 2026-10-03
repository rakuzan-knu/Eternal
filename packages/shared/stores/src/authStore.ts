import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

export interface UserSessionProfile {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  email?: string;
  role?: string;
}

export interface SetSessionPayload {
  accessToken: string;
  refreshToken?: string | null;
  user: UserSessionProfile;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserSessionProfile | null;
  isAuthenticated: boolean;
  setSession: {
    (payload: SetSessionPayload): void;
    (accessToken: string, user: UserSessionProfile, refreshToken?: string | null): void;
  };
  setAccessToken: (token: string | null) => void;
  clearSession: () => void;
}

const memoryStorage = new Map<string, string>();
let tauriStorePromise: Promise<{
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, val: unknown) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  save?: () => Promise<void>;
} | null> | null = null;

async function getTauriStore() {
  if (typeof window === 'undefined') return null;

  const isTauri = Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown })
      .__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown }).__TAURI__,
  );

  if (!isTauri) return null;

  if (!tauriStorePromise) {
    tauriStorePromise = (async () => {
      try {
        // Dynamically load @tauri-apps/plugin-store if available at runtime
        const pkg = '@tauri-apps/plugin-store';
        const mod = (await import(/* @vite-ignore */ pkg)) as {
          load: (
            path: string,
            options?: { autoSave?: boolean },
          ) => Promise<{
            get: <T>(key: string) => Promise<T | null>;
            set: (key: string, val: unknown) => Promise<void>;
            delete: (key: string) => Promise<boolean>;
            save?: () => Promise<void>;
          }>;
        };
        return await mod.load('.auth-secure.dat', { autoSave: true });
      } catch {
        return null;
      }
    })();
  }

  return tauriStorePromise;
}

let customStorageAdapter: StateStorage | null = null;

export function configureAuthStorage(adapter: StateStorage) {
  customStorageAdapter = adapter;
}

export const tauriSecureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (customStorageAdapter) {
      return customStorageAdapter.getItem(name);
    }
    const store = await getTauriStore();
    if (store) {
      const val = await store.get<string>(name);
      return val ?? null;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(name);
    }
    return memoryStorage.get(name) ?? null;
  },

  setItem: async (name: string, value: string): Promise<void> => {
    if (customStorageAdapter) {
      await customStorageAdapter.setItem(name, value);
      return;
    }
    const store = await getTauriStore();
    if (store) {
      await store.set(name, value);
      await store.save?.();
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(name, value);
      return;
    }
    memoryStorage.set(name, value);
  },

  removeItem: async (name: string): Promise<void> => {
    if (customStorageAdapter) {
      await customStorageAdapter.removeItem(name);
      return;
    }
    const store = await getTauriStore();
    if (store) {
      await store.delete(name);
      await store.save?.();
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(name);
      return;
    }
    memoryStorage.delete(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setSession: ((
        firstArg: string | SetSessionPayload,
        secondArg?: UserSessionProfile,
        thirdArg?: string | null,
      ) => {
        if (typeof firstArg === 'object') {
          set({
            accessToken: firstArg.accessToken,
            refreshToken: firstArg.refreshToken ?? null,
            user: firstArg.user,
            isAuthenticated: true,
          });
        } else if (secondArg) {
          set({
            accessToken: firstArg,
            refreshToken: thirdArg ?? null,
            user: secondArg,
            isAuthenticated: true,
          });
        }
      }) as AuthState['setSession'],

      setAccessToken: (accessToken) =>
        set((state) => ({
          accessToken,
          isAuthenticated: Boolean(accessToken && state.user),
        })),

      clearSession: () => {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-session',
      storage: createJSONStorage(() => tauriSecureStorage),
    },
  ),
);
