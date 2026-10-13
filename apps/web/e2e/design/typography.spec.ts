import { test, expect } from '@playwright/test';
import { designTokens } from '@social-network/shared-ui-primitives';

for (const scale of [1, 2]) {
  test(`system fonts: multilingual at ${scale * 100}%`, async ({ page }) => {
    const remoteRequests: string[] = [];
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') return route.continue();
      remoteRequests.push(url.href);
      return route.abort();
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      `/iframe.html?id=design-typography--system&viewMode=story&globals=textScale:${scale}`,
    );
    await expect(page.getByRole('heading', { name: 'System typography' })).toBeVisible();
    await expect(page.locator('html')).toHaveCSS('font-size', `${16 * scale}px`);
    const token = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--eternal-typography-family-web-sans')
        .trim(),
    );
    expect(token.replaceAll('"', "'")).toBe(designTokens.typography.familyWeb.sans);
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(390);
    expect(remoteRequests).toEqual([]);
    await expect(page).toHaveScreenshot(`typography-${scale * 100}.png`, { fullPage: true });
  });
}
