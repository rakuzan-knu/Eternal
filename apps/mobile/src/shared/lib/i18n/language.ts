import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Language = 'en' | 'uk';
export type LanguagePreference = 'system' | Language;

export function languageFromLocale(locale: string | undefined): Language {
  return locale?.toLowerCase().startsWith('uk') ? 'uk' : 'en';
}

export function systemLanguage(): Language {
  try {
    return languageFromLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'en';
  }
}

interface LanguageState {
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'mobile-language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ preference: state.preference }),
    },
  ),
);

export function languageReady(timeoutMs = 1500) {
  return new Promise<void>((done) => {
    if (useLanguageStore.persist.hasHydrated()) return done();
    const timer = setTimeout(done, timeoutMs);
    useLanguageStore.persist.onFinishHydration(() => {
      clearTimeout(timer);
      done();
    });
  });
}

const resolve = (preference: LanguagePreference): Language =>
  preference === 'system' ? systemLanguage() : preference;

export function getLanguage(): Language {
  return resolve(useLanguageStore.getState().preference);
}

export function useLanguage(): Language {
  return resolve(useLanguageStore((state) => state.preference));
}

export const LOCALES: Record<Language, string> = { en: 'en-US', uk: 'uk-UA' };

export function getLocale(language: Language = getLanguage()) {
  return LOCALES[language];
}
