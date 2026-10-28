import { expect, it } from 'vitest';
import { CONTENT_PAGE_IDS, CONTENT_PATHS, loadContentPage } from './content';
import { resolveContentPath } from './routing';

it('loads every content page in both languages without empty blocks', async () => {
  for (const id of CONTENT_PAGE_IDS) {
    for (const lang of ['en', 'uk'] as const) {
      const page = await loadContentPage(id, lang);
      expect(page.title.trim(), `${id}/${lang} title`).not.toBe('');
      expect(page.blocks.length, `${id}/${lang} blocks`).toBeGreaterThan(0);
      for (const block of page.blocks)
        if ('items' in block) expect(block.items.length, `${id}/${lang}`).toBeGreaterThan(0);
    }
  }
});

it('never shows all-caps titles', async () => {
  const shouting = (value: string | undefined) =>
    !!value && value === value.toUpperCase() && /\p{Lu}{4}/u.test(value);
  for (const id of CONTENT_PAGE_IDS)
    for (const lang of ['en', 'uk'] as const) {
      const page = await loadContentPage(id, lang);
      expect(shouting(page.title), `${id}: ${page.title}`).toBe(false);
      for (const block of page.blocks) {
        if ('title' in block) expect(shouting(block.title), `${id}: ${block.title}`).toBe(false);
        if (block.kind === 'cards')
          for (const card of block.items)
            expect(shouting(card.title), `${id}: ${card.title}`).toBe(false);
      }
    }
});

it('keeps card ids unique inside a block', async () => {
  for (const id of CONTENT_PAGE_IDS)
    for (const block of (await loadContentPage(id, 'en')).blocks)
      if (block.kind === 'cards')
        expect(new Set(block.items.map((card) => card.id)).size, id).toBe(block.items.length);
});

it('routes every registered path back to its own page', async () => {
  for (const [id, paths] of Object.entries(CONTENT_PATHS))
    for (const path of paths) expect(resolveContentPath(path)).toEqual({ kind: 'content', id });
});

it('resolves legal aliases, the safety center, external and unknown links', async () => {
  expect(resolveContentPath('/terms/applicant-candidate-privacy-policy')).toEqual({
    kind: 'document',
    id: 'applicant-privacy',
  });
  expect(resolveContentPath('/privacy/')).toEqual({ kind: 'document', id: 'privacy' });
  expect(resolveContentPath('/Safety-Library?tab=all')).toEqual({
    kind: 'content',
    id: 'safety-library',
  });
  expect(resolveContentPath('/safety')).toEqual({ kind: 'help' });
  expect(resolveContentPath('https://www.crisistextline.org/')).toEqual({
    kind: 'external',
    url: 'https://www.crisistextline.org/',
  });
  expect(resolveContentPath('/messages')).toEqual({ kind: 'web', path: '/messages' });
  expect(resolveContentPath('//evil.example/path')).toEqual({ kind: 'web', path: '/' });
  expect(resolveContentPath('javascript:alert(1)')).toEqual({ kind: 'web', path: '/' });
});

it('only links to paths the app can open', async () => {
  for (const id of CONTENT_PAGE_IDS)
    for (const block of (await loadContentPage(id, 'en')).blocks) {
      const links =
        block.kind === 'links'
          ? block.items.map((item) => item.path)
          : block.kind === 'cta'
            ? [block.path]
            : block.kind === 'cards'
              ? block.items.flatMap((card) => (card.link ? [card.link] : []))
              : [];
      for (const link of links.filter((path) => path !== '/'))
        expect(resolveContentPath(link).kind, `${id}: ${link}`).not.toBe('web');
    }
});
