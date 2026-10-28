import { afterEach, describe, expect, it } from 'vitest';
import { getLocale, getLanguageName } from '../locale';
import { useLanguageStore, SUPPORTED_LANGUAGES } from '../languageStore';
import { formatRelativeTime } from '../../formatRelativeTime';

afterEach(() => useLanguageStore.setState({ currentLanguage: 'English' }));
describe('Selected interface locale', () => {
  it.each(SUPPORTED_LANGUAGES)('provides a supported Intl locale for %s', (language) => {
    const locale = getLocale(language);
    expect(Intl.DateTimeFormat.supportedLocalesOf([locale])).toEqual([locale]);
  });
  it('uses Ukrainian plural forms and language names without country-code ambiguity', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });
    expect(formatRelativeTime(new Date(Date.now() - 2 * 60_000))).toBe('2 хвилини');
    expect(getLanguageName('uk', 'en-US')).toBe('Ukrainian');
    expect(getLocale()).toBe('uk-UA');
  });
});
