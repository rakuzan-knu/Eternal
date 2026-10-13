import { test, expect } from '../fixtures';
import { messageText, postText, prepareScreen } from './screen-fixtures';

test.use({ baseURL: 'http://127.0.0.1:6007' });

test('simplified glass removes blur in the built CSS', async ({ page }) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto(
    'http://127.0.0.1:6006/iframe.html?id=design-visual-effects--effects&viewMode=story',
  );
  const toggle = page.getByRole('button', { name: 'Simplify visual effects' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.eternal-glass').first()).toHaveCSS('backdrop-filter', 'none');
  await expect(page.locator('.eternal-glass').first()).toHaveCSS(
    'background-color',
    'rgb(23, 23, 23)',
  );
});

for (const screen of ['feed', 'profile', 'chat'] as const) {
  test(`${screen}: browser and touch reflow`, async ({ authenticatedPage: page }, testInfo) => {
    // 320 CSS px is the reflow area of a 1280px screen at 400% zoom.
    // This does not emulate the browser's zoom UI or native Dynamic Type.
    const viewport = testInfo.project.name.includes('iphone')
      ? { width: 414, height: 896 }
      : { width: 320, height: 740 };
    await page.setViewportSize(viewport);
    await page.goto(await prepareScreen(page, screen));
    const content = screen === 'chat' ? page.getByTestId('chat-thread') : page;
    // Initial route/module/data readiness has its own bound; assertions on the
    // loaded layout and subsequent interactions retain the usual timeouts.
    await expect(
      content
        .getByText(screen === 'chat' ? messageText : postText, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(viewport.width);
    if (screen === 'chat') {
      const composer = page.getByTestId('composer-outer-wrapper');
      await composer
        .getByRole('textbox', { name: 'Message', exact: true })
        .fill('Draft survives list navigation 👋');
      await expect(
        composer.getByRole('button', { name: 'Send message', exact: true }),
      ).toBeInViewport();
      await page.getByRole('button', { name: 'Back to chats', exact: true }).click();
      await page
        .getByText('Олександра Коваленко — long display name', { exact: true })
        .first()
        .click();
      await expect(composer.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(
        'Draft survives list navigation 👋',
      );
    }
    await testInfo.attach(`${screen}-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: screen !== 'chat' }),
      contentType: 'image/png',
    });
  });
}
