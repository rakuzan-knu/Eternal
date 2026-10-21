import { test, expect } from '@playwright/test';

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

test('registration gives date and gender fields distinct accessible names', async ({ page }) => {
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Back to login' })).toBeVisible();
  for (const name of ['Birth month', 'Birth day', 'Birth year', 'Gender']) {
    await expect(page.getByRole('combobox', { name, exact: true })).toBeVisible();
  }
  const month = page.getByRole('combobox', { name: 'Birth month' });
  await month.focus();
  await page.keyboard.press('ArrowDown');
  await expect(month).toHaveAttribute('aria-activedescendant', /option-/);
  await page.keyboard.press('Escape');
  await expect(month).toBeFocused();
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

test('careers opens job details by keyboard, traps focus, and returns it on Escape', async ({
  page,
}) => {
  await page.goto('/careers', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('combobox', { name: 'Department', exact: true })).toBeVisible();
  const job = page.locator('#all-jobs button').first();
  await job.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Your Full Name', exact: true })).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Close modal' });
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Submit Application', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(job).toBeFocused();
});
