import { useLanguageStore, type SupportedLanguage } from './languageStore';

const LOCALES: Record<SupportedLanguage, string> = {
  Deutsch: 'de-DE',
  English: 'en-US',
  'English (UK)': 'en-GB',
  Español: 'es-ES',
  Français: 'fr-FR',
  Italiano: 'it-IT',
  Magyar: 'hu-HU',
  Nederlands: 'nl-NL',
  Polski: 'pl-PL',
  'Português (Brasil)': 'pt-BR',
  Türkçe: 'tr-TR',
  Українська: 'uk-UA',
  日本語: 'ja-JP',
  한국어: 'ko-KR',
  繁體中文: 'zh-TW',
  简体中文: 'zh-CN',
};

export function getLocale(language = useLanguageStore.getState().currentLanguage): string {
  return LOCALES[language] ?? 'en-US';
}

export function useLocale(): string {
  return getLocale(useLanguageStore((state) => state.currentLanguage));
}

export function getLanguageName(languageCode: string, locale = getLocale()): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(languageCode) ?? languageCode;
  } catch {
    return languageCode;
  }
}
