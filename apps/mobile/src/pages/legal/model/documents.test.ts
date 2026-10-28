import { expect, it } from 'vitest';
import {
  DOCUMENTS,
  contentLanguage,
  loadDocument,
  sentenceCase,
  loadSafetyCenter,
  SAFETY_HUB_KEYS,
} from './documents';

it('loads every registered document in both languages with content', async () => {
  for (const doc of DOCUMENTS) {
    for (const lang of ['en', 'uk'] as const) {
      const loaded = await loadDocument(doc.id, lang);
      expect(loaded.title).toBe(doc.label[lang]);
      expect(loaded.sections.length).toBeGreaterThan(0);
      expect(loaded.sections.every((section) => section.subsections.length > 0)).toBe(true);
      expect(new Set(loaded.sections.map((section) => section.id)).size).toBe(
        loaded.sections.length,
      );
    }
  }
});

it('keeps document ids unique and web paths local', async () => {
  expect(new Set(DOCUMENTS.map((doc) => doc.id)).size).toBe(DOCUMENTS.length);
  expect(DOCUMENTS.every((doc) => doc.webPath.startsWith('/'))).toBe(true);
});

it('splits combined effective and updated dates', async () => {
  const terms = await loadDocument('terms', 'en');
  expect(terms.dates).toEqual([
    'Effective Date: September 1, 2026',
    'Last Updated: August 28, 2026',
  ]);
});

it('serves Ukrainian content for Ukrainian locales only', async () => {
  expect(contentLanguage('uk-UA')).toBe('uk');
  expect(contentLanguage('UK')).toBe('uk');
  expect(contentLanguage('en-US')).toBe('en');
  expect(contentLanguage('ru-UA')).toBe('en');
  expect(contentLanguage(undefined)).toBe('en');
  expect((await loadDocument('privacy', 'uk')).sections[0]?.title).not.toBe(
    (await loadDocument('privacy', 'en')).sections[0]?.title,
  );
});

it('turns all-caps headings into sentence case and keeps the brand name', async () => {
  expect(sentenceCase('ETERNAL SAFETY CENTER')).toBe('Eternal safety center');
  expect(sentenceCase('SAFETY LIBRARY')).toBe('Safety library');
  expect(sentenceCase('БІБЛІОТЕКА БЕЗПЕКИ')).toBe('Бібліотека безпеки');
  expect(sentenceCase('Already Mixed Case')).toBe('Already Mixed Case');
});

it('exposes safety hubs with local web links', async () => {
  for (const lang of ['en', 'uk'] as const) {
    const center = await loadSafetyCenter(lang);
    for (const key of SAFETY_HUB_KEYS) expect(center[key].link).toMatch(/^\//);
  }
});
