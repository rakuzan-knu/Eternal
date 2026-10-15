import { test, expect, type Page } from '@playwright/test';

async function openStory(page: Page, name: string) {
  await page.goto(`/iframe.html?id=design-reference--${name}&viewMode=story`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('main')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.protocol === 'data:') await route.continue();
    else await route.abort();
  });
});

for (const state of ['controls', 'pending', 'empty', 'failure']) {
  test(`${state} at desktop width`, async ({ page }) => {
    await openStory(page, state);
    await expect(page).toHaveScreenshot(`${state}-desktop.png`, { fullPage: true });
  });
}

test('controls at 320px and 200% text remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await openStory(page, 'controls');
  await expect(page).toHaveScreenshot('controls-narrow.png', { fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  await expect(page.locator('html')).toHaveCSS('font-size', '32px');
  await expect(page.getByRole('button', { name: 'Review changes' })).toBeVisible();
  await page.getByRole('tab', { name: 'Posts', exact: true }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Saved', exact: true })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Saved', exact: true })).toBeInViewport();
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page).toHaveScreenshot('controls-large-text.png', { fullPage: true });
});

test('dialog focus, dismissal and visual state', async ({ page }) => {
  await openStory(page, 'controls');
  const trigger = page.getByRole('button', { name: 'Review changes' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Review your changes' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Confirmation note')).toBeFocused();
  await expect(page).toHaveScreenshot('review-dialog.png');
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('menu and radio selection support keyboard input', async ({ page }) => {
  await openStory(page, 'controls');
  const trigger = page.getByRole('button', { name: 'More actions', exact: true });
  await trigger.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'View profile' })).toBeFocused();
  // Submenu coordinates are measured from the parent; settle its entrance first.
  await expect(page.getByRole('menu', { name: 'Actions', exact: true })).toHaveCSS('scale', '1');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitemcheckbox', { name: 'Dark', exact: true })).toBeFocused();
  await expect(page).toHaveScreenshot('nested-menu.png');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.getByRole('radio', { name: /^Friends/ }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: /^Only me/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});
