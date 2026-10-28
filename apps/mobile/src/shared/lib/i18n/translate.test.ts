import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
}));

const { CATALOG_PARTS, UK, UK_PLURALS } = await import('./catalog');
const { formatNumber, plural, tr } = await import('./translate');
const { languageFromLocale } = await import('./language');

const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('catalog', () => {
  it('translates every key with the same placeholders', () => {
    for (const [en, uk] of Object.entries(UK)) {
      expect(uk.trim(), en).not.toBe('');
      expect(placeholders(uk), en).toEqual(placeholders(en));
    }
  });

  it('translates a key shared by several areas the same way', () => {
    const seen = new Map<string, string>();
    const conflicts: string[] = [];
    for (const part of Object.values(CATALOG_PARTS))
      for (const [en, uk] of Object.entries(part)) {
        const previous = seen.get(en);
        if (previous !== undefined && previous !== uk) conflicts.push(`${en}: ${previous} / ${uk}`);
        seen.set(en, uk);
      }
    expect(conflicts).toEqual([]);
  });

  it('gives every plural all Ukrainian forms with a count', () => {
    for (const [en, forms] of Object.entries(UK_PLURALS))
      for (const form of [forms.one, forms.few, forms.many, forms.other])
        expect(form, en).toContain('{count}');
  });
});

it('fills variables and picks plural forms per language', () => {
  expect(tr('Type {name} to confirm', { name: 'alex' }, 'en')).toBe('Type alex to confirm');
  expect(tr('Type {name} to confirm', { name: 'alex' }, 'uk')).toBe(
    'Введіть alex, щоб підтвердити',
  );
  const forms = { one: '{count} member', other: '{count} members' } as const;
  expect(plural(1, forms, undefined, 'en')).toBe('1 member');
  expect(plural(3, forms, undefined, 'en')).toBe('3 members');
  expect(plural(1, forms, undefined, 'uk')).toBe('1 учасник');
  expect(plural(3, forms, undefined, 'uk')).toBe('3 учасники');
  expect(plural(11, forms, undefined, 'uk')).toBe('11 учасників');
  expect(formatNumber(12500, 'uk')).toMatch(/^12\s500$/);
});

it('detects Ukrainian locales only', () => {
  expect(languageFromLocale('uk-UA')).toBe('uk');
  expect(languageFromLocale('ru-UA')).toBe('en');
  expect(languageFromLocale(undefined)).toBe('en');
});
