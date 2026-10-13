import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncThemeCookie } from '@/shared/lib/cookieUtils';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        syncThemeCookie(theme);
        set({ theme });
      },
    }),
    { name: 'eternal-theme' },
  ),
);
