import { test, expect, type Locator } from '@playwright/test';

const prototypeURL = new URL('../../../../docs/design/prototypes.html', import.meta.url).href;

for (const platform of ['ios', 'android', 'desktop']) {
  for (const screen of ['feed', 'profile']) {
    test(`offline prototype: ${platform} ${screen} actions preserve scroll`, async ({ page }) => {
      await page.goto(prototypeURL);
      await page.locator('#platform').selectOption(platform);
      if (screen === 'profile')
        await page.locator('#screen [data-route="profile"]').first().click();
      // Exercise a scrollable pane on every platform, including short desktop content.
      await page.locator('#device').evaluate((element) => {
        element.style.height = '500px';
      });
      const scroller = page.locator('#screen .scroll');
      const position = () =>
        scroller.evaluate((element) => ({ pane: element.scrollTop, page: window.scrollY }));
      const toggle = async (button: Locator, pressed: boolean) => {
        await scroller.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        await button.scrollIntoViewIfNeeded();
        const before = await position();
        expect(before.pane).toBeGreaterThan(0);
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', String(pressed));
        await expect.poll(position).toEqual(before);
      };
      const like = page.locator('#screen [data-action="like"]');
      await toggle(like, true);
      await expect(like).toHaveText('♡ 129');
      await toggle(like, false);
      await expect(like).toHaveText('♡ 128');
      const save = page.locator('#screen [data-action="save"]');
      await toggle(save, true);
      await expect(save).toHaveText('Збережено');
      await toggle(save, false);
      await expect(save).toHaveText('Зберегти');
      const menuTrigger = page.locator('#screen [data-action="menu"]');
      await menuTrigger.click();
      const beforeMenuSave = await position();
      await page.locator('#post-menu [data-action="save-menu"]').click();
      await expect(save).toHaveAttribute('aria-pressed', 'true');
      await expect(menuTrigger).toBeFocused();
      await expect.poll(position).toEqual(beforeMenuSave);
      if (screen === 'profile') {
        await toggle(page.locator('#screen [data-action="follow"]'), true);
        await expect(page.locator('.stats span:nth-child(2) strong')).toHaveText('1 249');
        await toggle(page.locator('#screen [data-action="follow"]'), false);
        await expect(page.locator('.stats span:nth-child(2) strong')).toHaveText('1 248');
      }
    });
  }

  test(`offline prototype: ${platform} feed → profile → chat`, async ({ page }) => {
    const requests: string[] = [];
    await page.route(/^https?:/, (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    await page.goto(prototypeURL);
    await page.locator('#platform').selectOption(platform);
    await page.locator('#screen [data-route="profile"]').first().click();
    await expect(page.locator('#screen-title')).toHaveText('Профіль');
    await page.locator('#screen [data-route="chat"]').last().click();
    await expect(page.locator('#draft')).toBeVisible();
    await page.locator('#draft').fill('Привіт — offline 👋');
    await page.locator('#draft').press('Enter');
    await expect(page.locator('#messages')).toContainText('Привіт — offline 👋');
    await expect(page.locator('#draft')).toHaveValue('');
    await page.locator('#state').selectOption('error');
    await expect(page.locator('#messages')).toContainText('Не надіслано');
    await page.locator('#screen [data-action="retry-message"]').click();
    await expect(page.locator('#messages')).not.toContainText('Не надіслано');
    await expect(page.locator('#state')).toHaveValue('content');
    expect(requests).toEqual([]);
  });
}
