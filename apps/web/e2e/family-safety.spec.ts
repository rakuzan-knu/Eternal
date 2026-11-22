import { test, expect } from '@playwright/test';

for (const width of [360, 1280]) {
  test(`Family Center explains its actual limits in Ukrainian at ${width}px`, async ({ page }) => {
    await page.route('**/*', (route) => {
      const host = new URL(route.request().url()).hostname;
      return ['127.0.0.1', 'localhost'].includes(host) ? route.continue() : route.abort();
    });
    await page.addInitScript(() => {
      localStorage.setItem(
        'eternal_language_preference',
        JSON.stringify({ state: { currentLanguage: 'Українська' }, version: 0 }),
      );
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/safety-family-center', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('СІМЕЙНИЙ ЦЕНТР');
    await expect(page.getByText(/Щотижневі email-звіти недоступні/)).toBeVisible();
    const emailFaq = page.getByRole('button', { name: 'Як часто надсилаються щотижневі звіти?' });
    await emailFaq.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/Збережена опція не підтверджує доставку/)).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
  });
}
