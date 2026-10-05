import { test, expect } from '@playwright/test';

test('readable theme draft exposes measured feedback without saving', async ({
  page,
}, testInfo) => {
  const writes: string[] = [];
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.request().method()))
      writes.push(url.pathname);
    if (url.hostname === '127.0.0.1' && url.port === '6006') return route.continue();
    return route.abort();
  });
  await page.goto('/iframe.html?id=features-chat-selectthememodal--default&viewMode=story');
  await expect(page.getByRole('heading', { name: 'Chat Theme Customizer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use readable bubbles' })).toBeVisible();
  await page.getByRole('button', { name: 'Use readable bubbles' }).click();
  await expect(page.getByRole('status')).toContainText('Outgoing: solid message text reaches');
  await expect(page.getByRole('status')).toContainText('Incoming: solid message text reaches');
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Before changes', exact: true }).click();
  await expect(page.getByRole('status')).not.toContainText('Outgoing: solid message text reaches');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Outgoing: solid message text reaches');
  await testInfo.attach('readable-theme-preview', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
