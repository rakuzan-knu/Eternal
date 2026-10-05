import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { test, expect, mockApi, fulfillApi } from '../fixtures';
import { authorName } from './screen-fixtures';
import {
  extendedText,
  notifications,
  prepareExtended,
  reelComment,
  stateApi,
  type ExtendedState,
} from './extended-fixtures';

test.use({ baseURL: 'http://127.0.0.1:6007' });
const screens = ['search', 'notifications', 'stories', 'reels', 'settings'] as const;
type ExtendedScreen = (typeof screens)[number];

async function openSurface(page: Page, screen: ExtendedScreen, state: ExtendedState) {
  if (screen === 'search') {
    // Wait for the lazy route to mount before asserting its request state.
    await expect(
      page.getByPlaceholder('Search users, #hashtags, posts...', { exact: true }),
    ).toHaveValue('alexandra', { timeout: 30_000 });
  }
  if (screen === 'reels') {
    if ((page.viewportSize()?.width ?? 1280) < 640) {
      await expect(
        page.getByText('Помилка відтворення відео', { exact: true }).first(),
      ).toBeVisible();
    }
    await page.getByRole('button', { name: 'Переглянути коментарі', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: /Comments/ })).toBeVisible();
  }
  if (screen === 'settings') {
    const mobile = page.getByRole('button', { name: 'Open navigation', exact: true });
    if ((page.viewportSize()?.width ?? 1280) < 1024) {
      await expect(mobile).toBeVisible();
      await mobile.click();
    }
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('menu').getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Security', exact: true }).click();
    await page.getByRole('button', { name: 'Password & Security', exact: true }).click();
    await page.getByText('Active sessions', { exact: true }).click();
    if ((page.viewportSize()?.width ?? 1280) < 1024) {
      await page.evaluate(() => {
        const subnav = document.querySelector('form nav')?.parentElement;
        if (subnav) {
          subnav.scrollTop = 223;
        }
      });
    }
    await expect(
      page.getByRole('heading', { name: 'Active sessions', exact: true, level: 2 }),
    ).toBeVisible();
  }
  if (screen === 'stories' && state === 'content') {
    await page
      .getByRole('region', { name: 'Stories', exact: true })
      .getByText(authorName, { exact: true })
      .click();
    await expect(page.getByRole('button', { name: 'Close story viewer' })).toBeVisible();
    await page.getByTitle('Pause', { exact: true }).click();
  }
}

async function assertState(page: Page, screen: ExtendedScreen, state: ExtendedState) {
  if (state === 'loading') {
    const labels = { search: 'Searching people...', notifications: 'Loading notifications...' };
    if (screen === 'search' || screen === 'notifications')
      await expect(page.getByText(labels[screen], { exact: true })).toBeVisible();
    else
      await expect(
        page.getByRole('status', {
          name: `Loading ${screen === 'reels' ? 'comments' : screen === 'settings' ? 'sessions' : 'stories'}`,
          exact: true,
        }),
      ).toBeVisible();
    return;
  }
  if (state === 'error') {
    const title = {
      search: 'People search could not load',
      notifications: 'Notifications could not load',
      stories: 'Stories could not load',
      reels: 'Comments could not load',
      settings: 'Sessions could not load',
    };
    await expect(page.getByRole('alert').getByText(title[screen], { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    return;
  }
  if (state === 'empty') {
    const title = {
      search: 'No users found matching "alexandra"',
      notifications: 'No notifications yet',
      reels: 'No comments yet.',
      settings: 'No active sessions',
    };
    if (screen === 'stories') {
      await expect(page.getByRole('button', { name: 'Add story', exact: true })).toBeVisible();
      await expect(
        page
          .getByRole('region', { name: 'Stories', exact: true })
          .getByText(authorName, { exact: true }),
      ).toHaveCount(0);
    } else await expect(page.getByText(title[screen], { exact: true })).toBeVisible();
    return;
  }
  if (screen === 'search') await expect(page.getByText(authorName, { exact: true })).toBeVisible();
  else if (screen === 'settings')
    await expect(page.getByText(authorName + ' Chrome Windows', { exact: false })).toBeVisible();
  else if (screen === 'reels')
    await expect(
      page.getByTestId('reel-comments-drawer').getByText(extendedText, { exact: true }),
    ).toBeVisible();
  else
    await expect(
      page.getByText(extendedText, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
}

for (const screen of screens) {
  for (const state of ['loading', 'empty', 'error'] as const) {
    test(`extended ${screen}: ${state}`, async ({ authenticatedPage: page }) => {
      const fixture = await prepareExtended(page, screen, state);
      try {
        await page.goto(fixture.path, { waitUntil: 'domcontentloaded' });
        await openSurface(page, screen, state);
        await assertState(page, screen, state);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`extended-${screen}-${state}.png`);
      } finally {
        fixture.release();
      }
    });
  }
  for (const layout of [
    { name: 'desktop', width: 1280, height: 900, scale: 1 },
    { name: 'narrow', width: 390, height: 844, scale: 1 },
  ]) {
    test(`extended ${screen}: ${layout.name} long content`, async ({ authenticatedPage: page }) => {
      await page.setViewportSize(layout);
      const fixture = await prepareExtended(page, screen, 'content');
      await page.goto(fixture.path, { waitUntil: 'domcontentloaded' });
      await openSurface(page, screen, 'content');
      await assertState(page, screen, 'content');
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(layout.width);
      if (screen === 'reels') {
        await expect(page.getByRole('textbox', { name: 'Comment', exact: true })).toBeInViewport();
        await expect(
          page.getByRole('button', { name: 'Send comment', exact: true }),
        ).toBeInViewport();
      }
      await expect(page).toHaveScreenshot(`extended-${screen}-${layout.name}.png`, {
        // Pause is exercised above; elapsed RAF time before the click is variable.
        // Normalize only the decorative fill, preserving track/controls/media.
        stylePath:
          screen === 'stories'
            ? fileURLToPath(new URL('./story-snapshot.css', import.meta.url))
            : undefined,
      });
    });
  }
}

test('extended reel comments: failed GET is distinct from empty, retry retains draft', async ({
  authenticatedPage: page,
}) => {
  const fixture = await prepareExtended(page, 'reels', 'error');
  await page.goto(fixture.path);
  await openSurface(page, 'reels', 'error');
  await assertState(page, 'reels', 'error');
  await expect(page.getByText('No comments yet.', { exact: true })).not.toBeVisible();
  const composer = page.getByRole('textbox', { name: 'Comment', exact: true });
  await composer.fill('Зберегти чернетку 👩🏽‍💻');
  await mockApi(page, '/reels/reel-profkino-1/comments', { json: [reelComment] });
  await page.getByRole('button', { name: 'Retry comments', exact: true }).click();
  await expect(
    page.getByText(extendedText, { exact: true }).filter({ visible: true }).last(),
  ).toBeVisible();
  await expect(composer).toHaveValue('Зберегти чернетку 👩🏽‍💻');
  await expect(page.getByText('Comments could not load', { exact: true })).not.toBeVisible();
});

test('extended notifications: retry recovers the real list after HTTP failure', async ({
  authenticatedPage: page,
}) => {
  const fixture = await prepareExtended(page, 'notifications', 'error');
  await page.goto(fixture.path);
  await assertState(page, 'notifications', 'error');
  await expect(page.getByText('No notifications yet', { exact: true })).not.toBeVisible();
  await mockApi(page, '/notifications?**', { json: notifications });
  await page.getByRole('button', { name: 'Retry notifications', exact: true }).click();
  await assertState(page, 'notifications', 'content');
});

test('extended auth: empty form validates, server failure preserves long identity', async ({
  page,
}) => {
  await prepareExtended(page, 'stories', 'empty');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(
    page.getByText('Password must contain at least 6 characters.', { exact: true }),
  ).toBeVisible();
  const identity = page.getByPlaceholder('Email address or phone number');
  const password = page.getByPlaceholder('Password', { exact: true });
  await identity.fill('long.multilingual.design.review@example.test');
  await password.fill('offline-password');
  await mockApi(page, '/auth/login', { status: 503, json: { message: 'Offline fixture' } });
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(
    page.getByRole('alert').getByText('We could not log you in. Try again.', { exact: true }),
  ).toBeVisible();
  await expect(identity).toHaveValue('long.multilingual.design.review@example.test');
  await expect(password).toHaveValue('offline-password');
  await expect(page).toHaveScreenshot('extended-auth-error.png');
});

test('extended auth: pending login keeps controls disabled until response', async ({ page }) => {
  await prepareExtended(page, 'stories', 'empty');
  await page.goto('/login');
  await page.getByPlaceholder('Email address or phone number').fill('review@example.test');
  await page.getByPlaceholder('Password', { exact: true }).fill('offline-password');
  const release = await stateApi(page, '/auth/login', 'loading', {}, {});
  try {
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    const pending = page.getByRole('button', { name: 'Loading', exact: true });
    await expect(pending).toBeDisabled();
    await expect(pending).toHaveAttribute('aria-busy', 'true');
    await expect(page).toHaveScreenshot('extended-auth-loading.png');
  } finally {
    release();
  }
});

test('extended notifications: failed second page keeps loaded rows and retries the cursor', async ({
  authenticatedPage: page,
}) => {
  const fixture = await prepareExtended(page, 'notifications', 'content');
  const items = Array.from({ length: 8 }, (_, index) => ({
    ...notifications.items[0],
    id: `page-one-${index}`,
  }));
  let failNext = true;
  await page.route(
    (url) => url.port === '3000' && ['/notifications', '/v1/notifications'].includes(url.pathname),
    async (route) => {
      const next = new URL(route.request().url()).searchParams.get('cursor');
      await fulfillApi(
        route,
        next
          ? failNext
            ? { status: 503, json: { message: 'Offline next page' } }
            : {
                json: {
                  ...notifications,
                  items: [
                    {
                      ...notifications.items[0],
                      id: 'page-two',
                      actor: {
                        ...notifications.items[0].actor,
                        displayName: 'Recovered notification author',
                      },
                    },
                  ],
                },
              }
          : { json: { ...notifications, items, nextCursor: 'extended-cursor', hasMore: true } },
      );
    },
  );
  await page.goto(fixture.path);
  await page.getByRole('button', { name: 'View all 8 notifications', exact: true }).click();
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByText('More notifications could not load', { exact: true })).toBeVisible();
  await expect(page.getByText(authorName, { exact: true })).toHaveCount(8);
  await expect(page.getByText(authorName, { exact: true }).first()).toBeVisible();
  failNext = false;
  await page.getByRole('button', { name: 'Retry more notifications', exact: true }).click();
  await expect(page.getByText('Recovered notification author', { exact: true })).toBeVisible();
  await expect(page.getByText(authorName, { exact: true })).toHaveCount(8);
  await expect(
    page.getByText('More notifications could not load', { exact: true }),
  ).not.toBeVisible();
});
