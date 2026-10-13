import { test, expect, fulfillApi } from './fixtures';
import type { CDPSession, Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const me = { id: 'usr-me', username: 'mockme', displayName: 'Mock Me', avatar: null };

async function heap(page: Page, cdp: CDPSession) {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  return {
    heapBytes:
      metrics.find((metric: { name: string }) => metric.name === 'JSHeapUsedSize')?.value ?? 0,
    ...(await cdp.send('Memory.getDOMCounters')),
    media: await page.evaluate(() => ({
      elements: document.querySelectorAll('video').length,
      sourced: [...document.querySelectorAll('video')].filter((video) => video.getAttribute('src'))
        .length,
      playing: [...document.querySelectorAll('video')].filter((video) => !video.paused).length,
    })),
  };
}

test('500 ordinary posts retain a bounded reversible window and mutation state with multiple media', async ({
  authenticatedPage: page,
  context,
}, info) => {
  const fetched = new Set<number>();
  const liked = new Set<string>();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const post = (index: number) => ({
    id: `ordinary-${String(index).padStart(4, '0')}`,
    author: me,
    authorId: me.id,
    handle: me.username,
    text: `Ordinary feed post ${index}`,
    createdAt: new Date(Date.UTC(2026, 9, 1) - index * 60_000).toISOString(),
    likes: liked.has(`ordinary-${String(index).padStart(4, '0')}`) ? 1 : 0,
    isLiked: liked.has(`ordinary-${String(index).padStart(4, '0')}`),
    comments: 0,
    isSaved: false,
    media: [
      {
        id: `v-${index}`,
        type: 'VIDEO',
        url: `/videos/sample-reel.mp4?ordinary=${index}`,
        width: 720,
        height: 1280,
      },
      {
        id: `i1-${index}`,
        type: 'IMAGE',
        url: `/ordinary-image-${index}-1.svg`,
        width: 640,
        height: 360,
      },
      {
        id: `i2-${index}`,
        type: 'IMAGE',
        url: `/ordinary-image-${index}-2.svg`,
        width: 640,
        height: 360,
      },
    ],
  });
  await page.route('**/ordinary-image-*.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#334155"/></svg>',
    }),
  );
  await page.route(/https?:\/\/(localhost|127\.0\.0\.1):3000\//, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/v1/, '');
    let json: unknown = [];
    if (path === '/users/me' || path === '/users/usr-me') json = me;
    else if (path.includes('unread-count')) json = { count: 0 };
    else if (path === '/posts') {
      const start = Number(url.searchParams.get('after') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 10);
      const end = Math.min(500, start + limit);
      const data = Array.from({ length: end - start }, (_, offset) => {
        fetched.add(start + offset);
        return post(start + offset);
      });
      json = { data, nextCursor: end < 500 ? String(end) : null };
    } else if (/\/posts\/ordinary-\d+\/like$/.test(path)) {
      const id = path.split('/')[2];
      if (route.request().method() === 'POST') liked.add(id);
      else if (route.request().method() === 'DELETE') liked.delete(id);
      json = { success: true };
    } else if (/^\/posts\/ordinary-\d+$/.test(path)) json = post(Number(path.slice(-4)));
    else if (path.endsWith('/comments')) json = { data: [], nextCursor: null };
    await fulfillApi(route, { json });
  });
  await page.goto('/feed');
  const first = page.locator('#post-ordinary-0000');
  await expect(first).toBeVisible();
  await first.scrollIntoViewIfNeeded();
  await first.getByTitle('Like', { exact: true }).click();
  await expect(first.getByTitle('Unlike', { exact: true })).toBeVisible();
  // The production media player, not an inert media mock, decodes this local MP4.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('#post-ordinary-0000 video')].some(
      (video) => (video as HTMLVideoElement).readyState >= 2,
    ),
  );
  await page.evaluate(async () => {
    const video = document.querySelector('#post-ordinary-0000 video') as HTMLVideoElement;
    video.muted = true;
    await video.play();
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const before = await heap(page, cdp);
  const seen = new Set<string>();
  let maxPages = 0,
    maxLive = 0,
    maxVideoElements = 0,
    maxVideoSources = 0;
  let returnAnchor: { id: string; top: number } | undefined;
  for (let step = 0; step < 1600; step++) {
    const state = await page.evaluate(() => {
      const list = document.querySelector('[data-testid="bounded-post-list"]') as HTMLElement;
      return {
        ids: [...document.querySelectorAll('[id^="post-ordinary-"]')].map((element) =>
          element.id.slice(5),
        ),
        pages: Number(list?.dataset.feedWindowPages),
        live: Number(list?.dataset.livePostCount),
        videos: document.querySelectorAll('video').length,
        sources: [...document.querySelectorAll('video')].filter((video) =>
          video.getAttribute('src'),
        ).length,
      };
    });
    state.ids.forEach((id) => seen.add(id));
    maxPages = Math.max(maxPages, state.pages);
    maxLive = Math.max(maxLive, state.live);
    maxVideoElements = Math.max(maxVideoElements, state.videos);
    maxVideoSources = Math.max(maxVideoSources, state.sources);
    if (!returnAnchor && seen.size >= 250) {
      const id = await page.evaluate(
        () =>
          [...document.querySelectorAll<HTMLElement>('[id^="post-ordinary-"]')].find((row) => {
            const rect = row.getBoundingClientRect();
            return rect.bottom > 100 && rect.top < innerHeight;
          })!.id,
      );
      const row = page.locator(`#${id}`);
      await row.getByRole('button', { name: 'View comments', exact: true }).click();
      await expect(page.getByTitle('Close (Esc)', { exact: true })).toBeVisible();
      await page.getByTitle('Close (Esc)', { exact: true }).click();
      await expect(page.getByTitle('Close (Esc)', { exact: true })).toHaveCount(0);
      const top = await row.evaluate((element) => element.getBoundingClientRect().top);
      returnAnchor = { id, top };
      await page.getByRole('link', { name: 'Search', exact: true }).first().click();
      await expect(page).toHaveURL(/\/search/);
      await page.goBack();
      await expect(row).toBeVisible();
      await expect
        .poll(async () =>
          Math.abs((await row.evaluate((element) => element.getBoundingClientRect().top)) - top),
        )
        .toBeLessThan(8);
    }
    if (seen.size === 500) break;
    await page.evaluate(() => window.scrollBy(0, 450));
    await page.waitForTimeout(60);
  }
  expect(seen.size).toBe(500);
  expect(fetched.size).toBe(500);
  expect(maxPages).toBeLessThanOrEqual(5);
  expect(maxLive).toBeLessThanOrEqual(50);
  expect(maxVideoElements).toBeLessThanOrEqual(20);
  expect(maxVideoSources).toBeLessThanOrEqual(5);
  const atEnd = await heap(page, cdp);
  // Scroll into unloaded ordinal zero; the disk/cursor replay must recover it.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(first).toBeVisible({ timeout: 30_000 });
  await expect(first).toContainText('Ordinary feed post 0');
  await expect(first.getByTitle('Unlike', { exact: true })).toBeVisible();
  await expect(page.locator('[data-testid="bounded-post-list"]')).toHaveAttribute(
    'data-feed-start',
    '0',
  );
  const restored = await heap(page, cdp);
  await page.getByRole('link', { name: 'Search', exact: true }).first().click();
  await expect(page).toHaveURL(/\/search/);
  await expect(page.locator('[id^="post-ordinary-"]')).toHaveCount(0);
  const departed = await heap(page, cdp);
  expect(departed.media.sourced).toBe(0);
  expect(departed.heapBytes - before.heapBytes).toBeLessThan(16 * 1024 * 1024);
  expect(errors).toEqual([]);
  expect(returnAnchor).toBeDefined();
  const result = {
    before,
    atEnd,
    restored,
    departed,
    seen: seen.size,
    fetched: fetched.size,
    maxPages,
    maxLive,
    maxVideoElements,
    maxVideoSources,
    returnAnchor,
    errors,
  };
  await writeFile(info.outputPath('ordinary-feed-memory.json'), JSON.stringify(result, null, 2));
  await info.attach('ordinary-feed-memory', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
});

test('messenger pages cross keyboard boundaries and find old chats through server search and folders', async ({
  authenticatedPage: page,
}, info) => {
  const calls: { search: string; filter: string; start: number; rows: number; bytes: number }[] =
    [];
  const detailIds = new Set<string>();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const chat = (index: number) => ({
    id: `window-chat-${String(index).padStart(4, '0')}`,
    type: index % 10 === 9 ? 'GROUP' : 'DIRECT',
    name: index % 10 === 9 ? `Old group ${index}` : null,
    participants: [
      me,
      { id: `peer-${index}`, username: `peer${index}`, displayName: `Peer ${index}`, avatar: null },
    ].map((user) => ({
      userId: user.id,
      user,
      role: 'MEMBER',
      joinedAt: '2026-01-01T00:00:00Z',
      nickname: null,
      theme: 'default',
      muteLevel: 'NONE',
      mutedUntil: null,
    })),
    lastMessage: null,
    unreadCount: 0,
    pinnedMessages: [],
    myTheme: 'default',
    myMuteLevel: 'NONE',
    isArchived: false,
    isPinned: false,
    blockedByMe: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: new Date(Date.UTC(2026, 9, 1) - index * 60_000).toISOString(),
  });
  await page.route(/https?:\/\/(localhost|127\.0\.0\.1):3000\//, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/v1/, '');
    let json: unknown = [];
    if (path === '/users/me' || path === '/users/usr-me') json = me;
    else if (path.includes('unread-count')) json = { count: 0 };
    else if (path === '/conversations')
      throw new Error('Web must not fetch the legacy unbounded conversation list');
    else if (path === '/conversations/page') {
      const search = url.searchParams.get('search') ?? '';
      const filter = url.searchParams.get('filter') ?? 'ALL';
      const start = Number(url.searchParams.get('cursor') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 25);
      const matching = Array.from({ length: 1000 }, (_, i) => i).filter(
        (i) =>
          (filter !== 'GROUPS' || i % 10 === 9) &&
          (!search || `${chat(i).name ?? ''} Peer ${i} peer${i}`.includes(search)),
      );
      const end = Math.min(matching.length, start + limit);
      json = {
        data: matching.slice(start, end).map(chat),
        nextCursor: end < matching.length ? String(end) : null,
        hasMore: end < matching.length,
        order: 'activityAt',
      };
      if (route.request().method() !== 'OPTIONS')
        calls.push({
          search,
          filter,
          start,
          rows: end - start,
          bytes: JSON.stringify(json).length,
        });
    } else if (/^\/conversations\/window-chat-\d+$/.test(path)) {
      const id = path.split('/')[2];
      detailIds.add(id);
      json = chat(Number(id.slice(-4)));
    } else if (path.endsWith('/messages')) json = { data: [], hasMore: false, nextCursor: null };
    else if (path === '/conversations/search')
      json = { messages: [], people: [], media: [], files: [], links: [] };
    await fulfillApi(route, { json });
  });
  await page.goto('/messages/window-chat-0024');
  await expect(page.getByText('Peer 24', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page).toHaveURL(/\/messages\/window-chat-0025/);
  expect(calls.some((call) => call.start === 25 && call.filter === 'ALL')).toBe(true);
  await page.keyboard.press('Alt+ArrowUp');
  await expect(page).toHaveURL(/\/messages\/window-chat-0024/);
  await page.locator('[data-folder-id="groups"]').click();
  await expect.poll(() => calls.some((call) => call.filter === 'GROUPS')).toBe(true);
  await page.locator('[data-folder-id="all"]').click();
  await page.getByText('Search in Messenger', { exact: true }).click();
  const search = page.getByPlaceholder('Search messages, photos, music, files, and people...');
  await expect(search).toBeVisible();
  await search.pressSequentially('Old group 999', { delay: 20 });
  await page.locator('[data-search-nav-id="chat-match-window-chat-0999"]').click();
  await expect(page).toHaveURL(/\/messages\/window-chat-0999/);
  await expect.poll(() => detailIds.has('window-chat-0999')).toBe(true);
  expect(calls.filter((call) => call.search).map((call) => call.search)).toEqual(['Old group 999']);
  expect(Math.max(...calls.map((call) => call.rows))).toBeLessThanOrEqual(25);
  expect(Math.max(...calls.map((call) => call.bytes))).toBeLessThan(32 * 1024);
  expect(errors).toEqual([]);
  await writeFile(
    info.outputPath('conversation-paging.json'),
    JSON.stringify({ calls, detailIds: [...detailIds], errors }, null, 2),
  );
});
