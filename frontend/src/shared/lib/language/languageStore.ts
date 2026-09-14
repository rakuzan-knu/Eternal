import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SupportedLanguage =
  | 'Deutsch'
  | 'English'
  | 'English (UK)'
  | 'Español'
  | 'Français'
  | 'Italiano'
  | 'Magyar'
  | 'Nederlands'
  | 'Polski'
  | 'Português (Brasil)'
  | 'Türkçe'
  | 'Українська'
  | '日本語'
  | '한국어'
  | '繁體中文'
  | '简体中文';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'Deutsch',
  'English',
  'English (UK)',
  'Español',
  'Français',
  'Italiano',
  'Magyar',
  'Nederlands',
  'Polski',
  'Português (Brasil)',
  'Türkçe',
  'Українська',
  '日本語',
  '한국어',
  '繁體中文',
  '简体中文',
];

interface LanguageState {
  currentLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      currentLanguage: 'English',
      setLanguage: (lang: SupportedLanguage) => set({ currentLanguage: lang }),
    }),
    {
      name: 'eternal_language_preference',
    },
  ),
);
