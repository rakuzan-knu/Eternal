import { test, expect, fulfillApi } from './fixtures';
import { writeFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

const runtimeErrors = new WeakMap<Page, string[]>();

test.describe('Search network budget', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    const errors: string[] = [];
    runtimeErrors.set(page, errors);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /Maximum update depth|ErrorFallback|before initialization/.test(message.text())
      )
        errors.push(message.text());
    });
    await page.addInitScript(() => {
      localStorage.setItem(
        'recent_searches',
        JSON.stringify(
          Array.from({ length: 15 }, (_, i) => ({
            id: `recent-${i}`,
            username: `recent${i}`,
            displayName: `Recent ${i}`,
            avatar: null,
          })),
        ),
      );
    });
    await page.route(/https?:\/\/(localhost|127\.0\.0\.1):3000\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace(/^\/v1/, '');
      const json = path.includes('unread-count')
        ? { count: 0, total: 0 }
        : path === '/users/usr-me' || path === '/users/me'
          ? { id: 'usr-me', username: 'mockme', displayName: 'Mock Me', avatar: null }
          : path.startsWith('/posts/')
            ? { data: [], hasMore: false, nextCursor: null }
            : [];
      await fulfillApi(route, { json });
    });
  });

  test.afterEach(async ({ authenticatedPage: page }) => {
    expect(runtimeErrors.get(page) ?? [], 'no runtime errors or render feedback loops').toEqual([]);
  });

  test('cold search stays within 15 data requests and does not open chat', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const requests: string[] = [];
    const modules: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        url.port === '3000' &&
        request.method() !== 'OPTIONS' &&
        ['fetch', 'xhr'].includes(request.resourceType())
      )
        requests.push(url.pathname + url.search);
      if (request.resourceType() === 'script') modules.push(url.pathname);
    });
    await page.goto('/search');
    await expect(page.getByPlaceholder('Search users, #hashtags, posts...')).toBeVisible();
    // Observe beyond the debounce and first page render, including closed overlays.
    await page.waitForTimeout(1500);
    const report = JSON.stringify(
      { requests, dataRequestCount: requests.length, scriptCount: modules.length, modules },
      null,
      2,
    );
    await writeFile(testInfo.outputPath('network-budget.json'), report);
    await testInfo.attach('network-budget.json', { body: report, contentType: 'application/json' });
    console.info('SEARCH_NETWORK_BUDGET', JSON.stringify({ count: requests.length, requests }));
    expect(
      requests.filter((path) => /^\/(?:v1\/)?conversations(?:\/page)?(?:\?|$)/.test(path)),
    ).toEqual([]);
    expect(requests.filter((path) => /\/users\/recent\d+$/.test(path))).toEqual([]);
    expect(requests.filter((path) => /\/integrations\/music\//.test(path))).toEqual([]);
    expect(requests.length).toBeLessThanOrEqual(15);
    expect(
      modules.filter((path) =>
        /StoryEditorModal|StoryViewerModal|UndoClearHistorySnackbar|SpotifyLyricsModal|CallModal|useWebRTC/.test(
          path,
        ),
      ),
    ).toEqual([]);
  });

  test('People queries are debounced and hidden tabs do not fetch', async ({
    authenticatedPage: page,
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.port === '3000' && request.method() === 'GET')
        requests.push(url.pathname + url.search);
    });
    await page.goto('/search?q=carol&tab=People');
    await expect(page.getByPlaceholder('Search users, #hashtags, posts...')).toBeVisible();
    await page.waitForTimeout(500);
    requests.length = 0;
    await page.getByPlaceholder('Search users, #hashtags, posts...').press('End');
    await page
      .getByPlaceholder('Search users, #hashtags, posts...')
      .pressSequentially('ina', { delay: 40 });
    await expect(page).toHaveURL(/q=carolina/);
    await page.waitForTimeout(500);
    expect(requests.filter((path) => path.includes('/users/search'))).toHaveLength(1);
    expect(
      requests.filter((path) =>
        /\/posts\/|\/users\/(hashtags|top|suggested|trending-hashtags)/.test(path),
      ),
    ).toEqual([]);
  });

  test('a new keystroke aborts the pending request before the next debounce', async ({
    authenticatedPage: page,
  }) => {
    await page.route(/:3000\/(?:v1\/)?users\/search\?/, async (route) => {
      if (new URL(route.request().url()).searchParams.get('q') === 'slow') {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      await fulfillApi(route, { json: [] }).catch(() => {});
    });
    await page.goto('/search?tab=People');
    const input = page.getByPlaceholder('Search users, #hashtags, posts...');
    await expect(input).toBeVisible();
    const started = page.waitForRequest(
      (request) =>
        /\/users\/search/.test(request.url()) &&
        new URL(request.url()).searchParams.get('q') === 'slow',
    );
    await input.fill('slow');
    await started;
    const aborted = page.waitForEvent(
      'requestfailed',
      (request) =>
        /\/users\/search/.test(request.url()) &&
        new URL(request.url()).searchParams.get('q') === 'slow',
    );
    await input.fill('fresh');
    const request = await aborted;
    expect(request.failure()?.errorText).toContain('ERR_ABORTED');
    await expect(page).toHaveURL(/q=fresh/);
  });

  test('1000 people keep a bounded DOM and the last result remains reachable', async ({
    authenticatedPage: page,
  }) => {
    await page.route(/:3000\/(?:v1\/)?users\/search\?/, (route) =>
      fulfillApi(route, {
        json: Array.from({ length: 1000 }, (_, index) => ({
          id: `person-${index}`,
          username: `person${index}`,
          displayName: `Person ${index}`,
          avatar: null,
        })),
      }),
    );
    await page.goto('/search?q=person&tab=People');
    const list = page.getByRole('list', { name: 'People' });
    await expect(list.getByText('Person 0', { exact: true })).toBeVisible();
    expect(await list.getByRole('listitem').count()).toBeLessThan(35);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(list.getByText('Person 999', { exact: true })).toBeVisible();
    expect(await list.getByRole('listitem').count()).toBeLessThan(35);
  });

  test('1000 dialogs only mount the visible rows when Messenger is opened', async ({
    authenticatedPage: page,
  }) => {
    await page.route(/:3000\/(?:v1\/)?conversations\/page(?:\?|$)/, (route) =>
      fulfillApi(route, {
        json: {
          data: Array.from({ length: 1000 }, (_, index) => ({
            id: `dialog-${index}`,
            type: 'GROUP',
            name: `Dialog ${index}`,
            participants: [],
            participantCount: 0,
            hasMoreParticipants: false,
            unreadCount: 0,
            lastMessage: null,
            isArchived: false,
            myMuteLevel: 'NONE',
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
          })),
          hasMore: false,
          nextCursor: null,
          order: 'activityAt',
        },
      }),
    );
    await page.goto('/messages');
    await expect(page.getByText('Dialog 0', { exact: true })).toBeVisible();
    const list = page.getByRole('list', { name: 'Conversations' });
    const rows = list.getByRole('listitem');
    expect(await rows.count()).toBeLessThan(35);
    await list.evaluate((element) => element.scrollTo(0, element.scrollHeight));
    await expect(page.getByText('Dialog 999', { exact: true })).toBeVisible();
    expect(await rows.count()).toBeLessThan(35);
  });
});
