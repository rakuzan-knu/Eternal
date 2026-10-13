import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncConsentCookie } from '@/shared/lib/cookieUtils';

export interface CookiePreferences {
  strictlyNecessary: boolean;
  functional: boolean;
  analytics: boolean;
}

interface CookieConsentState {
  hasConsented: boolean;
  isPreferencesOpen: boolean;
  preferences: CookiePreferences;
  openPreferences: () => void;
  closePreferences: () => void;
  savePreferences: (prefs: Partial<CookiePreferences>) => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
}

export const useCookieConsentStore = create<CookieConsentState>()(
  persist(
    (set) => ({
      hasConsented: false,
      isPreferencesOpen: false,
      preferences: {
        strictlyNecessary: true,
        functional: true,
        analytics: false,
      },
      openPreferences: () => set({ isPreferencesOpen: true }),
      closePreferences: () => set({ isPreferencesOpen: false }),
      savePreferences: (newPrefs) =>
        set((state) => {
          const preferences = {
            ...state.preferences,
            ...newPrefs,
            strictlyNecessary: true, // Always required
          };
          syncConsentCookie({ hasConsented: true, preferences });
          return {
            hasConsented: true,
            isPreferencesOpen: false,
            preferences,
          };
        }),
      acceptAll: () =>
        set(() => {
          const preferences = {
            strictlyNecessary: true,
            functional: true,
            analytics: true,
          };
          syncConsentCookie({ hasConsented: true, preferences });
          return {
            hasConsented: true,
            isPreferencesOpen: false,
            preferences,
          };
        }),
      rejectNonEssential: () =>
        set(() => {
          const preferences = {
            strictlyNecessary: true,
            functional: false,
            analytics: false,
          };
          syncConsentCookie({ hasConsented: true, preferences });
          return {
            hasConsented: true,
            isPreferencesOpen: false,
            preferences,
          };
        }),
    }),
    {
      name: 'eternal_cookie_consent',
      partialize: (state) => ({
        hasConsented: state.hasConsented,
        preferences: state.preferences,
      }),
    },
  ),
);
