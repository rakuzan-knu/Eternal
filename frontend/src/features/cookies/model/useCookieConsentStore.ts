import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        set((state) => ({
          hasConsented: true,
          isPreferencesOpen: false,
          preferences: {
            ...state.preferences,
            ...newPrefs,
            strictlyNecessary: true, // Always required
          },
        })),
      acceptAll: () =>
        set({
          hasConsented: true,
          isPreferencesOpen: false,
          preferences: {
            strictlyNecessary: true,
            functional: true,
            analytics: true,
          },
        }),
      rejectNonEssential: () =>
        set({
          hasConsented: true,
          isPreferencesOpen: false,
          preferences: {
            strictlyNecessary: true,
            functional: false,
            analytics: false,
          },
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
