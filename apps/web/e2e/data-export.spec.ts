import { readFile } from 'node:fs/promises';
import {
  coreDataExportRequestSchema,
  getRegistrationPolicy,
  messengerDataExportRequestSchema,
} from '@social-network/shared-contracts';
import { test, expect } from './fixtures';

test('registration stays closed without collecting account fields', async ({ page }, info) => {
  await page.route('**/v1/auth/registration-policy', (route) =>
    route.fulfill({
      contentType: 'application/json',
      status: route.request().method() === 'OPTIONS' ? 204 : 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,X-Correlation-Id',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
      },
      body: route.request().method() === 'OPTIONS' ? '' : JSON.stringify(getRegistrationPolicy()),
    }),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/register');
  await expect(
    page.getByText('No market is currently open for new registrations.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Sign in to an existing account', exact: true }),
  ).toHaveAttribute('href', '/login');
  await page.screenshot({ path: info.outputPath('registration-closed-narrow.png') });
});

test('downloads all selected JSON pages without passwords or fake email delivery', async ({
  authenticatedPage: page,
}, info) => {
  let pages = 0;
  await page.route(/\/v1\/(?:users|messenger)\/me\/data-export$/, async (route) => {
    const headers = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers':
        'Authorization,Content-Type,X-Idempotency-Key,X-Correlation-Id',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const raw: unknown = JSON.parse(route.request().postData() ?? '{}');
    const core = coreDataExportRequestSchema.safeParse(raw);
    const body = core.success ? core.data : messengerDataExportRequestSchema.parse(raw);
    pages += 1;
    await route.fulfill({
      contentType: 'application/json',
      headers,
      body: JSON.stringify({
        schemaVersion: 1,
        service: body.section === 'messages' ? 'messenger' : 'core',
        section: body.section,
        exportedAt: '2026-11-05T00:00:00.000Z',
        items: [{ id: `fixture-record-${pages}` }],
        nextCursor: body.section === 'posts' && !body.cursor ? 'next-post-page' : null,
        limitations: ['Media files are excluded.'],
      }),
    });
  });
  await page.goto('/privacy/data-package');
  await page.getByRole('button', { name: 'Download my data', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Download your Eternal data' });
  await expect(dialog).toBeVisible();
  await page.getByLabel('Current password', { exact: true }).fill('fixture-password');
  await page.screenshot({ path: info.outputPath('data-export-desktop.png') });
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  const download = await downloadEvent;
  const path = await download.path();
  if (!path) throw new Error('Missing downloaded file');
  const file = await readFile(path, 'utf8');
  expect(pages).toBe(7);
  expect(file).toContain('fixture-record-7');
  expect(file).toContain('Media files are excluded.');
  expect(file).not.toContain('fixture-password');
  await expect(page.getByRole('status')).toContainText('Your browser download has started');
});

test('narrow dialog supports keyboard focus, cancellation and a readable error', async ({
  authenticatedPage: page,
}, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(/\/v1\/users\/me\/data-export$/, async (route) => {
    const headers = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers':
        'Authorization,Content-Type,X-Idempotency-Key,X-Correlation-Id',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    };
    await route.fulfill({
      status: route.request().method() === 'OPTIONS' ? 204 : 503,
      headers,
      body: '',
    });
  });
  await page.goto('/privacy/data-package');
  const opener = page.getByRole('button', { name: 'Download my data', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Download your Eternal data' });
  await expect(dialog).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
  await page.getByLabel('Current password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No partial file was downloaded');
  await page.getByRole('alert').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('data-export-narrow-error.png') });
  await page.keyboard.press('Tab');
  await expect(dialog.locator(':focus')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});
