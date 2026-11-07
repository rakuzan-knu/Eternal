import { test, expect } from '@playwright/test';
import { getRegistrationPolicy } from '@social-network/shared-contracts';

for (const path of ['/privacy', '/terms', '/acknowledgements', '/licenses', '/blog']) {
  test(`${path}: fits a narrow viewport and keeps navigation reachable`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(320);
    const navigation = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(navigation).toBeInViewport();
    const bounds = await navigation.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  });
}

test('closed registration explains availability and keeps sign-in reachable by keyboard', async ({
  page,
}) => {
  await page.route('**/v1/auth/registration-policy', (route) => {
    const headers = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,X-Correlation-Id',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    };
    return route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers })
      : route.fulfill({ json: getRegistrationPolicy(), headers });
  });
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Back to login' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('No market is currently open');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  const signIn = page.getByRole('link', { name: 'Sign in to an existing account', exact: true });
  await signIn.focus();
  await expect(signIn).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/login$/);
});

test('desktop public navigation opens with the keyboard and dismisses with Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/privacy', { waitUntil: 'domcontentloaded' });
  const safety = page.locator('header nav button').first();
  await safety.focus();
  await page.keyboard.press('Enter');
  await expect(safety).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.locator('header nav a:focus')).toHaveAttribute('href', '/safety-family-center');
  await page.keyboard.press('Escape');
  await expect(safety).toHaveAttribute('aria-expanded', 'false');
  await expect(safety).toBeFocused();
});

test('careers routes hide draft offers and keep the project contact reachable', async ({
  page,
}) => {
  for (const path of ['/careers', '/jobs']) {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const necessaryCookies = page.getByRole('button', { name: 'Necessary Only', exact: true });
    if (await necessaryCookies.isVisible()) await necessaryCookies.click();
    await expect(
      page.getByRole('heading', { name: 'No recruitment announced', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('status')).toContainText(
      'Applications are not accepted on this page.',
    );
    await expect(page.locator('#all-jobs')).toHaveCount(0);
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('combobox')).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(320);
    const contact = page.getByRole('link', { name: 'eternalnet.support@proton.me', exact: true });
    await contact.focus();
    await expect(contact).toBeFocused();
    await expect(contact).toHaveAttribute('href', 'mailto:eternalnet.support@proton.me');
    await page.screenshot({
      path: test.info().outputPath(path.slice(1) + '-unavailable.png'),
      fullPage: true,
    });
  }
});
