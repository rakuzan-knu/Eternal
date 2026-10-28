import { test, expect, mockApi } from './fixtures';

const communityFixture = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Design Collective',
  description: 'A place for thoughtful conversations about design.',
  avatar: null,
  memberCount: 12,
  createdAt: '2026-10-21T12:00:00.000Z',
};
const invitationToken = 'a'.repeat(43);

for (const width of [390, 1280]) {
  test.describe(`Communities ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('an incompatible API response shows recovery without crashing the app', async ({
      authenticatedPage: page,
    }) => {
      await page.routeWebSocket('**/*', (socket) => socket.close());
      await mockApi(page, '/messenger/communities', { json: '<html>SPA fallback</html>' });
      await mockApi(page, '/messenger/communities/mine', { json: { data: [], nextCursor: null } });
      await page.goto('/communities', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Communities could not be loaded.')).toBeVisible({
        timeout: 60000,
      });
      await expect(page.getByRole('button', { name: 'Try again' })).toBeEnabled();
      await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0);
    });

    test('public discovery keeps channel content behind membership', async ({
      authenticatedPage: page,
    }) => {
      await page.routeWebSocket('**/*', (socket) => socket.close());
      await mockApi(page, '/messenger/communities', {
        json: { data: [communityFixture], nextCursor: null },
      });
      await mockApi(page, '/messenger/communities/mine', { json: { data: [], nextCursor: null } });
      await mockApi(page, `/messenger/communities/${communityFixture.id}`, {
        json: communityFixture,
      });
      await mockApi(page, `/messenger/communities/${communityFixture.id}/channels`, {
        status: 403,
        json: { message: 'Membership required' },
      });
      await page.goto('/communities', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Find your people.' })).toBeVisible({
        timeout: 60000,
      });
      await page
        .getByRole('link')
        .filter({ has: page.getByRole('heading', { name: communityFixture.name }) })
        .click();
      await expect(page.getByRole('heading', { name: 'Join with an invitation' })).toBeVisible();
      await expect(page.getByRole('link', { name: /Open conversation/ })).toHaveCount(0);
      const dimensions = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        innerWidth,
      ]);
      expect(dimensions[0]).toBeLessThanOrEqual(dimensions[1] + 1);
      await page.screenshot({
        path: test.info().outputPath('community-public.png'),
        fullPage: true,
      });
    });

    test('admin can create a real invitation and see sharing options', async ({
      authenticatedPage: page,
    }) => {
      await page.routeWebSocket('**/*', (socket) => socket.close());
      await mockApi(page, `/messenger/communities/${communityFixture.id}`, {
        json: communityFixture,
      });
      await mockApi(page, `/messenger/communities/${communityFixture.id}/channels`, {
        json: {
          communityId: communityFixture.id,
          role: 'OWNER',
          data: [
            {
              id: 'channel',
              communityId: communityFixture.id,
              conversationId: 'conversation',
              name: 'general',
              description: 'Welcome',
              position: 0,
            },
          ],
        },
      });
      await mockApi(page, `/messenger/communities/${communityFixture.id}/members`, {
        json: { data: [], nextCursor: null },
      });
      await mockApi(page, `/messenger/communities/${communityFixture.id}/invites`, {
        json: { data: [], nextCursor: null },
      });
      await page.goto(`/communities/${communityFixture.id}`, { waitUntil: 'domcontentloaded' });
      await page
        .getByRole('complementary', { name: 'Community navigation' })
        .getByRole('button', { name: 'Invite people', exact: true })
        .click({ timeout: 60000 });
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Invitation history')).toBeVisible();
      // Method-specific routing avoids returning a history page to invitation creation.
      await page.route('**/messenger/communities/*/invites', async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        await route.fulfill({
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': 'http://127.0.0.1:5183',
            'Access-Control-Allow-Credentials': 'true',
          },
          body: JSON.stringify({
            id: 'invite-id',
            token: invitationToken,
            expiresAt: '2026-10-28T12:00:00.000Z',
            maxUses: null,
            useCount: 0,
            revokedAt: null,
          }),
        });
      });
      await dialog.getByRole('button', { name: 'Create invitation link' }).click();
      await expect(
        dialog.getByRole('textbox', { name: 'Invitation link', exact: true }),
      ).toHaveValue(`http://127.0.0.1:5183/invite/${invitationToken}`);
      await expect(dialog.getByRole('link', { name: 'Telegram', exact: true })).toHaveAttribute(
        'href',
        /t\.me\/share/,
      );
      await expect(dialog.getByRole('link', { name: 'Facebook', exact: true })).toBeVisible();
      await expect(dialog.getByRole('textbox', { name: 'Send in a direct message' })).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath('community-invite-share.png'),
        fullPage: true,
      });
    });

    test('accepting an invitation is explicit and failures retain a retry', async ({
      authenticatedPage: page,
    }) => {
      await page.routeWebSocket('**/*', (socket) => socket.close());
      await mockApi(page, `/messenger/communities/invites/${invitationToken}`, {
        json: { community: communityFixture, expiresAt: '2026-10-28T12:00:00.000Z' },
      });
      await mockApi(page, `/messenger/communities/invites/${invitationToken}/accept`, {
        status: 403,
        json: { message: 'Invitation unavailable' },
      });
      await page.goto(`/invite/${invitationToken}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: communityFixture.name })).toBeVisible({
        timeout: 60000,
      });
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
      const accept = page.getByRole('button', { name: 'Accept invitation' });
      await accept.click();
      await expect(page.getByRole('alert').filter({ hasText: 'You could not join' })).toBeVisible();
      await expect(accept).toBeEnabled();
      await expect(page).toHaveURL(new RegExp(`/invite/${invitationToken}$`));
      await mockApi(page, `/messenger/communities/invites/${invitationToken}/accept`, {
        json: { communityId: communityFixture.id, joined: true, alreadyMember: false },
      });
      await mockApi(page, `/messenger/communities/${communityFixture.id}`, {
        json: communityFixture,
      });
      await mockApi(page, `/messenger/communities/${communityFixture.id}/channels`, {
        json: { communityId: communityFixture.id, role: 'MEMBER', data: [] },
      });
      await mockApi(page, `/messenger/communities/${communityFixture.id}/members`, {
        json: { data: [], nextCursor: null },
      });
      await accept.click();
      await expect(page).toHaveURL(new RegExp(`/communities/${communityFixture.id}$`));
      await expect(page.getByRole('heading', { name: 'Channels', exact: true })).toBeVisible();
    });
  });
}

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`Audit remediation ${viewport.width}px`, () => {
    test.use({ viewport });

    test('registration keeps every field and starts with deliberate date and gender choices', async ({
      page,
    }) => {
      await page.goto('/register', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('combobox', { name: 'Birth month' })).toContainText('Month');
      await expect(page.getByRole('combobox', { name: 'Birth day' })).toContainText('Day');
      await expect(page.getByRole('combobox', { name: 'Birth year' })).toContainText('Year');
      await expect(page.getByRole('combobox', { name: 'Gender' })).toContainText('Select gender');
      await expect(page.getByRole('textbox', { name: 'Last name' })).toBeVisible();
      await page.getByRole('combobox', { name: 'Birth month' }).click();
      await expect(page.getByRole('option', { name: 'February', exact: true })).toBeVisible();
      await page.getByRole('option', { name: 'February', exact: true }).click();
      await expect(page.getByRole('combobox', { name: 'Birth month' })).toContainText('February');
      await page.screenshot({ path: test.info().outputPath('registration.png'), fullPage: true });
    });

    test('saved reels are added alongside existing post collections', async ({
      authenticatedPage: page,
    }) => {
      await page.routeWebSocket('**/*', (socket) => socket.close());
      await mockApi(page, '/users/by-username/mockme', {
        json: {
          id: 'usr-me',
          username: 'mockme',
          displayName: 'Mock Me',
          followersCount: 0,
          followingCount: 0,
        },
      });
      await mockApi(page, '/reels/saved', {
        json: { data: [], meta: { nextCursor: null, hasNextPage: false } },
      });
      await mockApi(page, '/users/me/saved-posts', { json: { posts: [], nextCursor: null } });
      await page.goto('/mockme?tab=saved', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Saved reels', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Explore reels' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Create a new collection' }).first(),
      ).toBeVisible();
      const savedHeading = await page
        .getByRole('heading', { name: 'Saved reels', exact: true })
        .boundingBox();
      expect(savedHeading?.y).toBeLessThan(viewport.height / 2);
      await page.screenshot({ path: test.info().outputPath('saved.png') });
    });

    test('group dialog closes from its search field and restores the opener', async ({
      authenticatedPage: page,
    }) => {
      await page.routeWebSocket('**/*', (socket) => socket.close());
      await mockApi(page, '/conversations/page**', {
        json: { data: [], hasMore: false, nextCursor: null },
      });
      await mockApi(page, '/conversations', { json: [] });
      await mockApi(page, '/conversations/folders', { json: [] });
      await mockApi(page, '/conversations/unread-count', { json: { count: 0 } });
      await page.goto('/messages', { waitUntil: 'domcontentloaded' });
      const opener = page.getByRole('button', { name: 'New group chat', exact: true });
      await opener.click();
      const dialog = page.getByRole('dialog', { name: 'New group chat' });
      await expect(dialog).toBeVisible();
      const search = dialog.getByRole('textbox', { name: 'Search by username' });
      await expect(search).toBeFocused();
      await search.fill('a');
      await dialog.getByRole('button', { name: 'Clear people search' }).click();
      await expect(search).toBeFocused();
      await expect(search).toHaveValue('');
      await search.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();
      const globalSearch = page.getByRole('button', { name: 'Search in Messenger', exact: true });
      await globalSearch.focus();
      await globalSearch.press('Enter');
      await expect(page.getByPlaceholder(/Search messages/i).first()).toBeVisible();
    });

    test('download offers the web app without pretending to distribute installers', async ({
      page,
    }) => {
      await page.goto('/download', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'ETERNAL IN YOUR BROWSER' })).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Open Eternal in your browser' }),
      ).toHaveAttribute('href', '/login');
      await expect(page.getByText('Not available yet', { exact: true })).toHaveCount(5);
      await expect(
        page.getByRole('button', { name: /Download for|App Store|Google Play/ }),
      ).toHaveCount(0);
      const pageWidth = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.width + 1);
    });

    test('settings keep the form visible and return focus after mobile navigation', async ({
      authenticatedPage: page,
    }) => {
      await page.routeWebSocket('**/*', (socket) => socket.close());
      await mockApi(page, '/posts?**', { json: { posts: [], nextCursor: null } });
      await mockApi(page, '/stories/feed', { json: [] });
      await mockApi(page, '/users/suggested?**', { json: [] });
      await mockApi(page, '/users/me/friends', { json: [] });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      if (viewport.width < 640)
        await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Account Information', exact: true }),
      ).toBeVisible();
      if (viewport.width < 640) {
        await page.getByRole('button', { name: 'All settings', exact: true }).click();
        await expect(
          page.getByRole('textbox', { name: 'Search settings', exact: true }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Account Information', exact: true }).click();
        await expect(page.getByRole('button', { name: 'All settings', exact: true })).toBeFocused();
        await expect(
          page.getByRole('textbox', { name: 'Search settings', exact: true }),
        ).toBeHidden();
      }
      const headingBox = await page
        .getByRole('heading', { name: 'Account Information', exact: true })
        .boundingBox();
      expect(headingBox).not.toBeNull();
      expect(headingBox!.y).toBeLessThan(viewport.height / 2);
    });
  });
}
