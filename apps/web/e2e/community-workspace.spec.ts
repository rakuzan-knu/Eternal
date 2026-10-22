import { test, expect, mockApi } from './fixtures';

const server = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Creative House',
  description:
    'A home for designers, makers and curious people. Share the process, find your people.',
  avatar: null,
  memberCount: 3,
  createdAt: '2026-10-21T00:00:00.000Z',
};
const channels = [
  {
    id: 'general',
    communityId: server.id,
    conversationId: 'conv-general',
    name: 'general',
    description: 'A little conversation goes a long way. Say hello.',
    position: 0,
  },
  {
    id: 'design-feedback',
    communityId: server.id,
    conversationId: 'conv-design',
    name: 'design-feedback',
    description: 'Work in progress, thoughtful critique and fresh perspectives.',
    position: 1,
  },
  {
    id: 'listening-room',
    communityId: server.id,
    conversationId: 'conv-music',
    name: 'listening-room',
    description: 'The soundtrack to whatever you are making.',
    position: 2,
  },
];
const people = [
  {
    userId: 'usr-me',
    username: 'mockme',
    displayName: 'Alex Morgan',
    avatar: null,
    role: 'OWNER',
    state: 'ACTIVE',
  },
  {
    userId: 'usr-jules',
    username: 'jules',
    displayName: 'Jules Park',
    avatar: null,
    role: 'ADMIN',
    state: 'ACTIVE',
  },
  {
    userId: 'usr-sam',
    username: 'sam',
    displayName: 'Sam Rivera',
    avatar: null,
    role: 'MEMBER',
    state: 'ACTIVE',
  },
];
for (const width of [390, 1440]) {
  test.describe(`Community workspace ${width}px`, () => {
    test.use({ viewport: { width, height: 960 } });
    test.beforeEach(async ({ authenticatedPage: page }) => {
      await page.routeWebSocket('**/*', (socket) => socket.close());
      await mockApi(page, '/messenger/communities', { json: { data: [server], nextCursor: null } });
      await mockApi(page, '/messenger/communities/mine', {
        json: { data: [server], nextCursor: null },
      });
      await mockApi(page, `/messenger/communities/${server.id}`, { json: server });
      await mockApi(page, `/messenger/communities/${server.id}/channels`, {
        json: { communityId: server.id, role: 'OWNER', data: channels },
      });
      await mockApi(page, `/messenger/communities/${server.id}/members`, {
        json: { data: people, nextCursor: null },
      });
      for (const channel of channels) {
        await mockApi(page, `/conversations/${channel.conversationId}`, {
          json: {
            id: channel.conversationId,
            communityId: server.id,
            type: 'GROUP',
            name: channel.name,
            avatar: null,
            description: channel.description,
            createdById: 'usr-me',
            participants: people.map((person) => ({
              userId: person.userId,
              user: {
                id: person.userId,
                username: person.username,
                displayName: person.displayName,
                avatar: null,
              },
              role: person.role,
              joinedAt: '2026-10-21T00:00:00.000Z',
              nickname: null,
              theme: 'default',
              muteLevel: 'NONE',
              mutedUntil: null,
            })),
            lastMessage: null,
            unreadCount: 0,
            myTheme: 'default',
            myMuteLevel: 'NONE',
            myNickname: null,
            isArchived: false,
            isPinned: false,
            blockedByMe: false,
            createdAt: '2026-10-21T00:00:00.000Z',
            updatedAt: '2026-10-21T00:00:00.000Z',
            pinnedMessages: [],
          },
        });
        await mockApi(page, `/conversations/${channel.conversationId}/messages`, {
          json: {
            data: [
              {
                id: 'msg-1',
                conversationId: channel.conversationId,
                sender: {
                  id: 'usr-jules',
                  username: 'jules',
                  displayName: 'Jules Park',
                  avatar: null,
                },
                body: 'Welcome! Share what you are working on — a sketch, a question or a fresh idea.',
                messageType: 'TEXT',
                replyTo: null,
                forwardedFrom: null,
                attachments: [],
                reactions: [],
                readBy: [],
                isEdited: false,
                isDeleted: false,
                isPinned: false,
                createdAt: '2026-10-22T08:00:00.000Z',
                editedAt: null,
              },
            ],
            hasMore: false,
            nextCursor: null,
          },
        });
      }
    });
    test('server context and the original conversation tools stay available', async ({
      authenticatedPage: page,
    }) => {
      await page.goto(`/communities/${server.id}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Welcome to Creative House' })).toBeVisible({
        timeout: 60000,
      });
      await page.screenshot({
        path: test.info().outputPath('workspace-overview.png'),
        fullPage: true,
      });
      await page
        .getByRole('navigation', { name: 'Community channels' })
        .getByRole('link', { name: 'design-feedback', exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/communities/${server.id}/channels/design-feedback$`),
      );
      await expect(page.getByTestId('chat-thread')).toBeVisible({ timeout: 60000 });
      await expect(page.getByText('Creative House · 3 members', { exact: true })).toBeVisible();
      await page
        .getByRole('textbox', { name: 'Message', exact: true })
        .fill('Keep this channel draft');
      await page.screenshot({
        path: test.info().outputPath('workspace-channel.png'),
        fullPage: true,
      });
      if (width < 768)
        await page.getByRole('button', { name: 'Back to community channels' }).click();
      else
        await page
          .getByRole('navigation', { name: 'Community sections' })
          .getByRole('link', { name: 'Overview' })
          .click();
      await expect(page).toHaveURL(new RegExp(`/communities/${server.id}$`));
      const search = page.getByRole('textbox', { name: 'Filter channels' });
      await search.fill('missing');
      await expect(page.getByText('No channels match your search.')).toBeVisible();
      await page.getByRole('button', { name: 'Clear channel search' }).click();
      await expect(search).toBeFocused();
      await expect(search).toHaveValue('');
      await page
        .getByRole('navigation', { name: 'Community channels' })
        .getByRole('link', { name: 'design-feedback', exact: true })
        .click();
      await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(
        'Keep this channel draft',
      );
      await page.getByRole('button', { name: 'Back to community channels' }).click();
      await page
        .getByRole('navigation', { name: 'Community sections' })
        .getByRole('link', { name: /Members/ })
        .click();
      await expect(page.getByRole('region', { name: 'Community members' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Jules Park', exact: true })).toBeVisible();
      const bounds = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
      }));
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
    });
    test('channel management preserves drafts, handles conflicts and saves categories and ordering', async ({
      authenticatedPage: page,
    }) => {
      const managed = channels.map((channel, index) => ({
        ...channel,
        id: `20000000-0000-4000-8000-00000000000${index + 1}`,
        categoryId: null as string | null,
      }));
      let state = {
        communityId: server.id,
        role: 'OWNER',
        revision: 0,
        categories: [] as { id: string; name: string; position: number }[],
        data: managed,
      };
      let fail = true;
      await page.route(`**/messenger/communities/${server.id}/channels`, (route) =>
        route.fulfill({ json: state }),
      );
      await page.route(`**/messenger/communities/${server.id}/channel-layout`, async (route) => {
        if (fail) {
          await route.fulfill({ status: 409, json: { message: 'Changed concurrently' } });
          return;
        }
        const input = route.request().postDataJSON();
        state = {
          ...state,
          revision: state.revision + 1,
          categories: input.categories.map(
            (item: { id: string; name: string }, position: number) => ({ ...item, position }),
          ),
          data: input.channels.map(
            (
              item: { id: string; name: string; description: string; categoryId: string | null },
              position: number,
            ) => ({ ...managed.find((channel) => channel.id === item.id), ...item, position }),
          ),
        };
        await route.fulfill({ json: state });
      });
      await page.goto(`/communities/${server.id}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Manage channels', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Manage channels', exact: true });
      await dialog.getByLabel('Channel name', { exact: true }).fill('welcome');
      await page.keyboard.press('Escape');
      await expect(dialog.getByText('Discard your unsaved channel changes?')).toBeVisible();
      await dialog.getByRole('button', { name: 'Keep editing' }).click();
      await expect(dialog.getByLabel('Channel name', { exact: true })).toHaveValue('welcome');
      await dialog.getByRole('button', { name: 'Save changes' }).click();
      await expect(dialog.getByRole('alert')).toContainText('Channels changed');
      await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await dialog.getByRole('button', { name: 'Discard changes' }).click();
      fail = false;
      await page.getByRole('button', { name: 'Manage channels', exact: true }).click();
      await dialog.getByRole('button', { name: 'Add category' }).click();
      await dialog.getByLabel('Category 1 name', { exact: true }).fill('Studio');
      await dialog.getByLabel('Channel name', { exact: true }).fill('welcome');
      await dialog.getByRole('combobox', { name: 'Channel category', exact: true }).click();
      await page.getByRole('option', { name: 'Studio', exact: true }).click();
      await dialog.getByRole('button', { name: 'Move channel welcome down', exact: true }).click();
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/channel-layout-${width}.png`, fullPage: true });
      await dialog.getByRole('button', { name: 'Save changes' }).click();
      await expect(dialog).toHaveCount(0);
      const navigation = page.getByRole('navigation', { name: 'Community channels' });
      await expect(navigation.getByRole('heading', { name: 'Studio', exact: true })).toBeVisible();
      await expect(navigation.getByRole('link', { name: 'welcome', exact: true })).toBeVisible();
      expect(state.data[1].name).toBe('welcome');
      expect(state.data[1].categoryId).toBe(state.categories[0].id);
      await page.reload();
      await expect(navigation.getByRole('link', { name: 'welcome', exact: true })).toBeVisible();
    });
    test('archives and restores a channel with retained history and stable links', async ({
      authenticatedPage: page,
    }) => {
      const id = '30000000-0000-4000-8000-000000000001';
      let archivedAt: string | null = null;
      let revision = 0;
      const managed = { ...channels[0], id, archivedAt };
      await page.route(`**/messenger/communities/${server.id}/channels`, (route) =>
        route.fulfill({
          json: {
            communityId: server.id,
            role: 'OWNER',
            revision,
            categories: [],
            data: [{ ...managed, archivedAt }],
          },
        }),
      );
      await page.route(
        `**/messenger/communities/${server.id}/channels/${id}/archive`,
        async (route) => {
          const input = route.request().postDataJSON();
          expect(input.revision).toBe(revision);
          archivedAt = input.archived ? '2026-10-22T00:00:00.000Z' : null;
          revision++;
          await route.fulfill({ json: { ...managed, archivedAt } });
        },
      );
      await page.goto(`/communities/${server.id}`, { waitUntil: 'domcontentloaded' });
      const openManagement = () =>
        page.getByRole('button', { name: 'Manage channels', exact: true }).click();
      await openManagement();
      const manager = page.getByRole('dialog', { name: 'Manage channels', exact: true });
      await manager.getByRole('button', { name: 'Archive channel', exact: true }).click();
      const confirm = page.getByRole('dialog', { name: 'Archive #general?', exact: true });
      await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
      await expect(confirm).toHaveCSS('opacity', '1');
      await page.screenshot({
        path: `test-results/channel-archive-confirm-${width}.png`,
        fullPage: true,
      });
      await confirm.getByRole('button', { name: 'Archive channel', exact: true }).click();
      await expect(confirm).toHaveCount(0);
      await expect(manager).toHaveCount(0);
      const navigation = page.getByRole('navigation', { name: 'Community channels' });
      await expect(navigation.getByRole('heading', { name: 'Archived channels' })).toBeVisible();
      await expect(
        navigation.getByRole('link', { name: 'general (archived)', exact: true }),
      ).toHaveAttribute('href', `/communities/${server.id}/channels/${id}`);
      await openManagement();
      await manager.getByRole('button', { name: 'Restore channel', exact: true }).click();
      const restore = page.getByRole('dialog', { name: 'Restore #general?', exact: true });
      await restore.getByRole('button', { name: 'Restore channel', exact: true }).click();
      await expect(manager).toHaveCount(0);
      await expect(navigation.getByRole('link', { name: 'general', exact: true })).toBeVisible();
      expect(revision).toBe(2);
      await page.reload();
      await expect(navigation.getByRole('link', { name: 'general', exact: true })).toBeVisible();
    });
    test('private channel access requires review and survives reload', async ({
      authenticatedPage: page,
    }) => {
      const id = '50000000-0000-4000-8000-000000000001';
      const memberId = '50000000-0000-4000-8000-000000000002';
      let isPrivate = false;
      let revision = 0;
      const managed = { ...channels[0], id };
      await page.route(`**/messenger/communities/${server.id}/channels`, (route) =>
        route.fulfill({
          json: {
            communityId: server.id,
            role: 'OWNER',
            revision,
            categories: [],
            data: [{ ...managed, isPrivate }],
          },
        }),
      );
      await page.route(`**/messenger/communities/${server.id}/members**`, (route) =>
        route.fulfill({ json: { data: [{ ...people[2], userId: memberId }], nextCursor: null } }),
      );
      await page.route(
        `**/messenger/communities/${server.id}/channels/${id}/access`,
        async (route) => {
          if (route.request().method() === 'PATCH') {
            const input = route.request().postDataJSON();
            expect(input).toEqual({ isPrivate: true, memberIds: [memberId], revision: 0 });
            isPrivate = true;
            revision++;
          }
          await route.fulfill({
            json: { isPrivate, memberIds: isPrivate ? [memberId] : [], revision },
          });
        },
      );
      await page.goto(`/communities/${server.id}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Manage channels', exact: true }).click();
      await page.getByRole('button', { name: 'Manage channel access', exact: true }).click();
      const dialog = page.getByRole('dialog').last();
      await dialog.getByRole('checkbox', { name: 'Private channel', exact: true }).check();
      await dialog.getByRole('checkbox', { name: /Sam Rivera/ }).check();
      await dialog.getByRole('button', { name: 'Review access changes' }).click();
      await expect(dialog.getByText(/Other members will lose access/)).toBeVisible();
      expect(isPrivate).toBe(false);
      await dialog.getByRole('button', { name: 'Apply access changes' }).click();
      await expect(
        page
          .getByRole('navigation', { name: 'Community channels' })
          .getByRole('link', { name: /general/ }),
      ).toBeVisible();
      expect(isPrivate).toBe(true);
      await page.reload();
      await page.getByRole('button', { name: 'Manage channels', exact: true }).click();
      await page.getByRole('button', { name: 'Manage channel access', exact: true }).click();
      await expect(
        page.getByRole('checkbox', { name: 'Private channel', exact: true }),
      ).toBeChecked();
      await expect(page.getByRole('dialog').last()).toHaveCSS('opacity', '1');
      await page.screenshot({
        path: `test-results/private-channel-access-${width}.png`,
        fullPage: true,
      });
    });
    test('private attachment resolves in the browser and denied media offers retry', async ({
      authenticatedPage: page,
    }) => {
      const id = '60000000-0000-4000-8000-000000000001';
      let deny = false;
      const storageUrl = 'https://closed-media.test/fixture.png?signature=temporary';
      await page.route('https://closed-media.test/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'image/png',
          body: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTZkAAAAASUVORK5CYII=',
            'base64',
          ),
        }),
      );
      await page.route(`**/uploads/direct/private/${id}`, (route) =>
        route.fulfill({
          status: deny ? 403 : 200,
          headers: {
            'Access-Control-Allow-Origin':
              route.request().headers().origin ?? new URL(page.url()).origin,
            'Access-Control-Allow-Credentials': 'true',
          },
          json: deny
            ? { message: 'access revoked' }
            : { url: storageUrl, expiresAt: new Date(Date.now() + 60000).toISOString() },
        }),
      );
      await mockApi(page, '/conversations/conv-general/messages', {
        json: {
          data: [
            {
              id: 'private-message',
              conversationId: 'conv-general',
              sender: {
                id: 'usr-jules',
                username: 'jules',
                displayName: 'Jules Park',
                avatar: null,
              },
              body: 'Private image',
              messageType: 'IMAGE',
              replyTo: null,
              forwardedFrom: null,
              attachments: [
                {
                  id: 'private-attachment',
                  type: 'IMAGE',
                  url: `private-media://${id}`,
                  fileName: 'private.png',
                  mimeType: 'image/png',
                  size: 68,
                  width: 1,
                  height: 1,
                  duration: null,
                  thumbnailUrl: null,
                },
              ],
              reactions: [],
              readBy: [],
              isEdited: false,
              isDeleted: false,
              isPinned: false,
              createdAt: '2026-10-22T08:00:00.000Z',
              editedAt: null,
            },
          ],
          hasMore: false,
          nextCursor: null,
        },
      });
      await page.goto(`/communities/${server.id}/channels/general`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.getByTestId('chat-thread')).toBeVisible();
      const image = page.locator(`img[src="${storageUrl}"]`).first();
      await expect(image).toBeVisible();
      await expect(image).toHaveJSProperty('naturalWidth', 1);
      deny = true;
      await page.reload();
      await expect(
        page.getByText('Private attachment unavailable.', { exact: false }).first(),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retry attachment' }).first()).toBeVisible();
    });
    test('an unknown channel cannot mount a different conversation', async ({
      authenticatedPage: page,
    }) => {
      let requests = 0;
      page.on('request', (request) => {
        if (request.url().includes('/conversations/forged')) requests++;
      });
      await page.goto(`/communities/${server.id}/channels/forged`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.getByRole('heading', { name: 'Channel unavailable' })).toBeVisible({
        timeout: 60000,
      });
      await expect(page.getByTestId('chat-thread')).toHaveCount(0);
      expect(requests).toBe(0);
    });
    test('joining from a pasted link opens a preview before membership changes', async ({
      authenticatedPage: page,
    }) => {
      const token = 'a'.repeat(43);
      await mockApi(page, `/messenger/communities/invites/${token}`, {
        json: { community: server, expiresAt: '2026-10-30T00:00:00.000Z' },
      });
      let accepted = false;
      page.on('request', (request) => {
        if (request.url().endsWith('/accept')) accepted = true;
      });
      await page.goto('/communities', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Join with a link' }).click();
      const dialog = page.getByRole('dialog', { name: 'Join a community' });
      await dialog
        .getByRole('textbox', { name: 'Invitation link' })
        .fill(`https://other.example/invite/${token}`);
      await dialog.getByRole('button', { name: 'Preview invitation' }).click();
      await expect(page).toHaveURL(new RegExp(`/invite/${token}$`));
      await expect(page.getByRole('heading', { name: server.name, level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeEnabled();
      expect(accepted).toBe(false);
    });
  });
}
