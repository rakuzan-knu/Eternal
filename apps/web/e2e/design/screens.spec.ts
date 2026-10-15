import { test, expect } from '../fixtures';
import {
  messageText,
  postText,
  prepareScreen,
  recoverScreen,
  type Screen,
} from './screen-fixtures';
import { auditReadability } from './readability';
import { writeFile } from 'node:fs/promises';

test.use({ baseURL: 'http://127.0.0.1:6007' });

const readiness = { feed: postText, profile: postText, chat: messageText };
const emptyText = {
  feed: "There's nothing here yet...",
  profile: 'No posts have been created yet.',
  chat: 'No messages here yet. Send a greeting to start the conversation!',
};
const errorText = {
  feed: 'Your feed could not load',
  profile: 'Failed to load profile. Please try again later.',
  chat: 'Messages could not load',
};

for (const screen of ['feed', 'profile', 'chat'] as const) {
  for (const layout of [
    { name: 'desktop', width: 1280, height: 900, scale: 1 },
    { name: 'narrow', width: 390, height: 844, scale: 1 },
    { name: 'large-text', width: 320, height: 740, scale: 2 },
  ]) {
    test(`${screen}: ${layout.name} with long multilingual content`, async ({
      authenticatedPage: page,
    }, testInfo) => {
      await page.setViewportSize(layout);
      const path = await prepareScreen(page, screen);
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.evaluate((scale) => {
        document.documentElement.style.fontSize = `${16 * scale}px`;
      }, layout.scale);
      await expect(page.locator('html')).toHaveCSS('font-size', `${16 * layout.scale}px`);
      const content = screen === 'chat' ? page.getByTestId('chat-thread') : page;
      if (screen === 'profile') {
        const message = page.getByRole('button', { name: 'Message', exact: true });
        await expect(message).toBeVisible();
        const bounds = await message.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(layout.width);
      }
      await expect(
        content.getByText(readiness[screen], { exact: true }).filter({ visible: true }).first(),
      ).toBeVisible();
      if (screen === 'chat') {
        const composer = page.getByTestId('composer-outer-wrapper');
        await expect(composer).toBeInViewport();
        const bounds = await composer.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(layout.width);
        const field = composer.getByRole('textbox', { name: 'Message', exact: true });
        await expect(field).toBeInViewport();
        const fieldBounds = await field.boundingBox();
        expect(fieldBounds!.width).toBeGreaterThanOrEqual(bounds!.width * 0.5);
        await field.fill('Draft for target review');
        const send = composer.getByRole('button', { name: 'Send message', exact: true });
        await expect(send).toBeInViewport();
        const sendBounds = await send.boundingBox();
        expect(sendBounds!.x + sendBounds!.width).toBeLessThanOrEqual(layout.width);
        await field.fill('');
      }
      await page.evaluate(() => document.fonts.ready);
      if (screen === 'feed' && layout.width >= 1024) {
        await expect(
          page.getByText('No suggestions available right now.', { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText('No friends yet. Follow creators above to start chatting!', {
            exact: true,
          }),
        ).toBeVisible();
      }
      const audit = await auditReadability(page);
      await writeFile(testInfo.outputPath('readability.json'), JSON.stringify(audit, null, 2));
      await testInfo.attach('readability.json', {
        body: JSON.stringify(audit, null, 2),
        contentType: 'application/json',
      });
      expect(audit.text.filter((entry) => !entry.passes)).toEqual([]);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(layout.width);
      await expect(page).toHaveScreenshot(`${screen}-${layout.name}.png`, {
        fullPage: screen !== 'chat',
      });
    });
  }
  for (const state of ['empty', 'error'] as const) {
    test(`${screen}: ${state} state`, async ({ authenticatedPage: page }) => {
      const path = await prepareScreen(page, screen, state);
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(
        page
          .getByText((state === 'empty' ? emptyText : errorText)[screen], { exact: true })
          .first(),
      ).toBeVisible({ timeout: 20_000 });
      if (screen === 'feed') {
        await expect(
          page.getByText('No suggestions available right now.', { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText('No friends yet. Follow creators above to start chatting!', {
            exact: true,
          }),
        ).toBeVisible();
      }
      await expect(page).toHaveScreenshot(`${screen}-${state}.png`);
    });
  }
}

test('narrow Messenger returns to list and opens the conversation', async ({
  authenticatedPage: page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const path = await prepareScreen(page, 'chat');
  await page.goto(path);
  await expect(
    page.getByTestId('chat-thread').getByText(messageText, { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to chats', exact: true }).click();
  await expect(page.getByTestId('chat-thread')).not.toBeVisible();
  await page
    .getByText('Олександра Коваленко — long display name', { exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(
    page.getByTestId('chat-thread').getByText(messageText, { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to chats', exact: true }).click();
  await page.getByRole('button', { name: 'Back to feed', exact: true }).click();
  await expect(
    page.getByText(postText, { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();
});

test('mobile navigation drawer keeps Create actions reachable at 200%', async ({
  authenticatedPage: page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await prepareScreen(page, 'feed');
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
  await navigation.getByRole('button', { name: 'Open navigation' }).click();
  await page.locator('#app-navigation').getByRole('link', { name: 'Create', exact: true }).click();
  const create = page.getByRole('button', { name: 'Create Post', exact: true });
  await create.scrollIntoViewIfNeeded();
  await expect(create).toBeInViewport();
  const bounds = await create.boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  await create.click();
  await expect(page.getByPlaceholder("What's new?")).toBeFocused();
});

for (const screen of ['feed', 'chat'] satisfies Screen[]) {
  test(`${screen}: retry preserves draft and recovers content`, async ({
    authenticatedPage: page,
  }) => {
    const path = await prepareScreen(page, screen, 'error');
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(errorText[screen], { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    const composer =
      screen === 'feed'
        ? page.getByPlaceholder("What's new?")
        : page.getByPlaceholder(/message/i).last();
    await composer.fill('Keep this draft — чернетка 👋');
    await recoverScreen(page, screen);
    await page
      .getByRole('button', {
        name: screen === 'feed' ? 'Retry feed' : 'Retry messages',
        exact: true,
      })
      .click();
    const content = screen === 'chat' ? page.getByTestId('chat-thread') : page;
    await expect(content.getByText(readiness[screen], { exact: true }).first()).toBeVisible();
    await expect(composer).toHaveValue('Keep this draft — чернетка 👋');
  });
}
