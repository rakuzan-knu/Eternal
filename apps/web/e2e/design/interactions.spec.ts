import { test, expect, mockApi, fulfillApi } from '../fixtures';
import { type Locator, type Page } from '@playwright/test';
import { authorName, message, post, prepareScreen } from './screen-fixtures';

test.use({ baseURL: 'http://127.0.0.1:6007' });
// Multi-step journeys include real socket-to-HTTP timeouts.
// Keep individual assertions bounded; allow the complete journey to finish.
test.setTimeout(90_000);

const draftText = 'Незавершений текст 👋 — keep this draft';
const sentText = 'Повідомлення із перевірки безперервних дій';
const posts = () =>
  Array.from({ length: 30 }, (_, index) => ({
    ...post,
    id: `interaction-post-${index}`,
    isLiked: false,
    isSaved: false,
    isReposted: false,
  }));
const messages = () =>
  Array.from({ length: 60 }, (_, index) => ({
    ...message,
    id: `interaction-message-${index}`,
    body: `History ${index}: ${message.body}`,
    createdAt: new Date(Date.parse(message.createdAt) + index * 60_000).toISOString(),
  }));

async function preparePosts(page: Page, screen: 'feed' | 'profile') {
  const path = await prepareScreen(page, 'profile');
  const data = posts();
  await mockApi(page, '/posts?**', { json: { posts: data, nextCursor: null } });
  await mockApi(page, '/users/usr-alexandra/posts?**', { json: { posts: data, nextCursor: null } });
  await page.goto(screen === 'feed' ? '/' : path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#post-interaction-post-0')).toBeVisible({ timeout: 45_000 });
  return data;
}

async function prepareChat(page: Page) {
  const path = await prepareScreen(page, 'chat');
  const data = messages();
  await mockApi(page, '/conversations/design-conversation/messages?**', {
    json: { data, hasMore: false, nextCursor: null },
  });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  const field = page
    .getByTestId('composer-outer-wrapper')
    .getByRole('textbox', { name: 'Message', exact: true });
  await expect(field).toBeVisible({ timeout: 45_000 });
  const scroller = page.getByTestId('message-scroll');
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBeGreaterThan(1000);
  await expect
    .poll(() =>
      scroller.evaluate(
        (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
      ),
    )
    .toBeLessThanOrEqual(20);
  await settleScroll(scroller);
  return { data, field, scroller };
}

async function settleScroll(scroller: Locator) {
  await scroller.evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        let previous = element.scrollTop;
        let stableFrames = 0;
        const frame = () => {
          stableFrames = element.scrollTop === previous ? stableFrames + 1 : 0;
          previous = element.scrollTop;
          if (stableFrames >= 3) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
}

async function readHistory(page: Page, scroller: Locator) {
  const touchContext = test.info().project.use.isMobile === true;
  if (touchContext) await scroller.focus();
  else await scroller.hover();
  const viewport = await scroller.evaluate((element) => element.clientHeight);
  // Firefox bounds one wheel event to less than a viewport. Mobile WebKit
  // does not support Playwright wheel input; its named scroll region supports
  // native keyboard history browsing. This does not simulate a touch swipe.
  for (let input = 0; input < (touchContext ? 3 : 2); input += 1) {
    const before = await scroller.evaluate((element) => element.scrollTop);
    if (touchContext) await scroller.press('PageUp');
    else await page.mouse.wheel(0, -Math.max(200, viewport) * 2);
    await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeLessThan(before);
    await settleScroll(scroller);
  }
  await expect(page.getByTitle('Scroll to bottom')).toBeVisible();
}

for (const layout of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'narrow', width: 390, height: 844 },
]) {
  for (const screen of ['feed', 'profile'] as const) {
    test(`continuity: ${layout.name} ${screen} mutations preserve scroll and focus`, async ({
      authenticatedPage: page,
    }) => {
      await page.setViewportSize(layout);
      const data = await preparePosts(page, screen);
      const draft = page.getByPlaceholder("What's new?");
      if (screen === 'feed') await draft.fill(draftText);
      await page.evaluate(() => window.scrollTo(0, 1400));
      const card = page.locator('#post-interaction-post-6');
      const calls: string[] = [];
      let release = () => {};
      let gate = Promise.resolve();
      await page.route('**/posts/interaction-post-6/*', async (route) => {
        const method = route.request().method();
        if (method === 'OPTIONS') return fulfillApi(route);
        await gate;
        const action = new URL(route.request().url()).pathname.split('/').at(-1);
        calls.push(`${method} ${action}`);
        const enabled = method === 'POST';
        data[6] =
          action === 'like'
            ? { ...data[6], isLiked: enabled, likes: enabled ? 13 : 12 }
            : action === 'repost'
              ? { ...data[6], isReposted: enabled, reposts: enabled ? 2 : 1 }
              : { ...data[6], isSaved: enabled };
        await mockApi(page, '/posts?**', { json: { posts: data, nextCursor: null } });
        await mockApi(page, '/users/usr-alexandra/posts?**', {
          json: { posts: data, nextCursor: null },
        });
        await fulfillApi(route, { json: { success: true } });
      });
      for (const [beforeTitle, afterTitle, method, action] of [
        ['Like', 'Unlike', 'POST', 'like'],
        ['Unlike', 'Like', 'DELETE', 'like'],
        ['Repost', 'Undo repost', 'POST', 'repost'],
        ['Undo repost', 'Repost', 'DELETE', 'repost'],
        ['Save post (Hold for collections)', 'Remove from Saved', 'POST', 'save'],
        ['Remove from Saved', 'Save post (Hold for collections)', 'DELETE', 'save'],
      ]) {
        const button = card.getByTitle(beforeTitle, { exact: true });
        await button.scrollIntoViewIfNeeded();
        const keyboard = method === 'DELETE';
        if (keyboard) await button.focus();
        const before = await page.evaluate(() => window.scrollY);
        expect(before).toBeGreaterThan(0);
        gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        const request = page.waitForRequest(
          (request) =>
            request.method() === method && request.url().endsWith(`/interaction-post-6/${action}`),
        );
        try {
          if (keyboard) await button.press('Space');
          else await button.click();
          await request;
          const toggled = card.getByTitle(afterTitle, { exact: true });
          await expect(toggled).toBeVisible();
          if (keyboard) await expect(toggled).toBeFocused();
          if (action !== 'save')
            await expect(toggled).toHaveText(
              action === 'like' ? (method === 'POST' ? '13' : '12') : method === 'POST' ? '2' : '1',
            );
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
          if (screen === 'feed') await expect(draft).toHaveValue(draftText);
          const refetch = page.waitForResponse(
            (response) =>
              response.request().method() === 'GET' &&
              new URL(response.url()).pathname.replace(/^\/v1(?=\/)/, '') ===
                (screen === 'feed' ? '/posts' : '/users/usr-alexandra/posts'),
          );
          release();
          await refetch;
          await expect(toggled).toBeVisible();
          if (keyboard) await expect(toggled).toBeFocused();
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
          if (action === 'save') {
            // A visible toast can cover the next action on a narrow screen.
            // Dismiss it through its real control before measuring the next tap.
            await page.getByRole('button', { name: 'Close notification', exact: true }).click();
            await expect(
              page.getByRole('button', { name: 'Close notification', exact: true }),
            ).toHaveCount(0);
            await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
          }
        } finally {
          release();
        }
      }
      expect(calls).toEqual([
        'POST like',
        'DELETE like',
        'POST repost',
        'DELETE repost',
        'POST save',
        'DELETE save',
      ]);
    });
  }

  test(`continuity: ${layout.name} browser Back restores feed draft and scroll`, async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(layout);
    await preparePosts(page, 'feed');
    const draft = page.getByPlaceholder("What's new?");
    await draft.fill(draftText);
    await page.evaluate(() => window.scrollTo(0, 1400));
    const link = page
      .locator('#post-interaction-post-6')
      .getByRole('link', { name: authorName, exact: true });
    await link.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(0);
    await link.click();
    await expect(page).toHaveURL(/\/profile\/alexandra$/);
    await expect(page.getByText('@alexandra', { exact: true })).toBeVisible();
    await expect(draft).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Message', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL('http://127.0.0.1:6007/');
    await expect(draft).toHaveValue(draftText);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
  });

  test(`continuity: ${layout.name} send and retry preserve history, identity and new draft`, async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(layout);
    const { data, field, scroller } = await prepareChat(page);
    const requests: { clientMessageId: string; clientSeq?: number; text?: string }[] = [];
    let fail = true;
    const sent = new Map<string, typeof message>();
    await page.route('**/conversations/design-conversation/messages', async (route) => {
      if (route.request().method() === 'OPTIONS') return fulfillApi(route);
      if (route.request().method() !== 'POST') {
        return fulfillApi(route, {
          json: { data: [...data, ...sent.values()], hasMore: false, nextCursor: null },
        });
      }
      const payload = route.request().postDataJSON();
      requests.push(payload);
      if (fail) return fulfillApi(route, { status: 503, json: { message: 'Offline fixture' } });
      const response = {
        ...message,
        id: `sent-${payload.clientMessageId}`,
        sender: { id: 'usr-me', username: 'mockme', displayName: 'Mock Me', avatar: null },
        body: payload.text,
        createdAt: '2026-10-03T12:00:00.000Z',
        status: 'SENT',
        clientMessageId: payload.clientMessageId,
      };
      sent.set(payload.clientMessageId, response);
      await fulfillApi(route, { json: response });
    });
    await field.fill(sentText);
    await readHistory(page, scroller);
    const before = await scroller.evaluate((element) => element.scrollTop);
    expect(before).toBeGreaterThan(0);
    await expect(page.getByTestId('chat-thread').getByTitle('Scroll to bottom')).toBeVisible();
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(field).toHaveValue('');
    await expect(field).toBeFocused();
    await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBe(before);
    // The failed bubble is intentionally in the newer part of the history.
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const retry = page.getByRole('button', { name: 'Retry', exact: true });
    await expect(retry).toBeVisible({ timeout: 20_000 });
    await field.fill(draftText);
    fail = false;
    const acknowledged = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/conversations/design-conversation/messages') &&
        response.status() === 200,
    );
    await retry.click();
    await acknowledged;
    await expect(retry).toHaveCount(0, { timeout: 20_000 });
    await expect(field).toHaveValue(draftText);
    await expect(field).toBeFocused();
    await expect(page.getByText(sentText, { exact: true })).toHaveCount(1);
    expect(new Set(requests.map((request) => request.clientMessageId)).size).toBe(1);
    expect(requests.every((request) => Number.isInteger(request.clientSeq))).toBe(true);
    expect(new Set(requests.map((request) => request.clientSeq)).size).toBe(1);
    expect(sent.size).toBe(1);
  });

  test(`continuity: ${layout.name} successful send preserves history and a newer draft during acknowledgement`, async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(layout);
    const { field, scroller } = await prepareChat(page);
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const identities = new Set<string>();
    await page.route('**/conversations/design-conversation/messages', async (route) => {
      if (route.request().method() === 'OPTIONS') return fulfillApi(route);
      const payload = route.request().postDataJSON();
      identities.add(payload.clientMessageId);
      expect(Number.isInteger(payload.clientSeq)).toBe(true);
      await gate;
      await fulfillApi(route, {
        json: {
          ...message,
          id: `sent-${payload.clientMessageId}`,
          clientMessageId: payload.clientMessageId,
          sender: { id: 'usr-me', username: 'mockme', displayName: 'Mock Me', avatar: null },
          body: payload.text,
          status: 'SENT',
          createdAt: '2026-10-03T12:00:00.000Z',
        },
      });
    });
    try {
      await field.fill(sentText);
      await readHistory(page, scroller);
      await expect(page.getByTitle('Scroll to bottom')).toBeVisible();
      const before = await scroller.evaluate((element) => element.scrollTop);
      const request = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/conversations/design-conversation/messages'),
      );
      await page.getByRole('button', { name: 'Send message', exact: true }).click();
      await expect(field).toHaveValue('');
      await expect(field).toBeFocused();
      await request;
      await field.fill(draftText);
      const acknowledged = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().endsWith('/conversations/design-conversation/messages') &&
          response.status() === 200,
      );
      release();
      await acknowledged;
      await expect(field).toHaveValue(draftText);
      await expect(field).toBeFocused();
      await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBe(before);
      await scroller.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(page.getByText(sentText, { exact: true })).toHaveCount(1);
      expect(identities.size).toBe(1);
    } finally {
      release();
    }
  });
}

test('continuity: immediate Back to chats preserves the latest draft and history position', async ({
  authenticatedPage: page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-10-03T12:00:00Z') });
  const { field, scroller } = await prepareChat(page);
  await readHistory(page, scroller);
  const before = await scroller.evaluate((element) => element.scrollTop);
  await page.clock.pauseAt(new Date('2026-10-03T12:01:00Z'));
  await field.fill(draftText);
  // Same input task, before the old 150ms draft debounce can complete.
  await field.evaluate((element, text) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(element, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    const back = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Back to chats',
    );
    if (!back) throw new Error('Back to chats must be available');
    back.click();
  }, `${draftText} останні символи`);
  await expect(page).toHaveURL('http://127.0.0.1:6007/messages');
  await page.clock.resume();
  const conversation = page.getByRole('button', {
    name: `Open conversation with ${authorName}`,
    exact: true,
  });
  await expect(conversation).toBeFocused();
  const menu = page.getByRole('button', {
    name: `Conversation actions for ${authorName}`,
    exact: true,
  });
  await conversation.press('Tab');
  await expect(menu).toBeFocused();
  await menu.press('Shift+Tab');
  await expect(conversation).toBeFocused();
  await conversation.press('Enter');
  await expect(field).toHaveValue(`${draftText} останні символи`);
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBe(before);
});
