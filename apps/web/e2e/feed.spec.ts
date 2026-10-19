import { test, expect, mockApi } from './fixtures';

test.describe('Feed (authenticated, mocked API)', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await mockApi(authenticatedPage, '/posts?**', {
      json: {
        data: [
          {
            id: 'post-1',
            authorId: 'usr-alice',
            author: 'Alice Mock',
            handle: 'alice',
            text: 'Hello from the mocked feed!',
            createdAt: new Date().toISOString(),
            likes: 12,
            comments: 3,
            reposts: 1,
          },
          {
            id: 'post-2',
            authorId: 'usr-bob',
            author: 'Bob Mock',
            handle: 'bob',
            text: 'Second mocked post body',
            createdAt: new Date().toISOString(),
            likes: 4,
            comments: 0,
            reposts: 0,
          },
        ],
        meta: { nextCursor: null },
      },
    });
  });

  test('renders mocked posts from the API on /', async ({ authenticatedPage: page }) => {
    await page.goto('/');

    await expect(page.getByText('Hello from the mocked feed!')).toBeVisible();
    await expect(page.getByText('Second mocked post body')).toBeVisible();
    await expect(page.getByText('@alice').first()).toBeVisible();
    await expect(page.getByText('@bob').first()).toBeVisible();
  });

  test('post actions stay ordered and menus overlay cards on desktop and mobile', async ({
    authenticatedPage: page,
  }) => {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const post = page.locator('#post-post-1');
      await expect(post.getByText('Hello from the mocked feed!')).toBeVisible();
      const like = post.getByTitle('Like', { exact: true });
      await expect(like.locator('..').locator('button').first()).toHaveAttribute('title', 'Like');
      await post.getByRole('button', { name: 'More options' }).click();
      const menu = page.getByRole('menu', { name: 'Post actions' });
      await expect(menu).toBeVisible();
      expect(await menu.evaluate((element) => element.parentElement === document.body)).toBe(true);
      expect(await menu.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
      await expect(menu.getByRole('button', { name: 'Report', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();

      await post.getByTitle('Save to collection', { exact: true }).click();
      const collections = page.getByRole('dialog', { name: 'Save to collection' });
      await expect(collections).toBeVisible();
      expect(await collections.evaluate((element) => element.parentElement === document.body)).toBe(
        true,
      );
      const bounds = await collections.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      await page.keyboard.press('Escape');
      await expect(collections).toBeHidden();
    }
  });

  test('profile hover shows a moving loading skeleton', async ({ authenticatedPage: page }) => {
    let releaseProfile = () => {};
    const pendingProfile = new Promise<void>((resolve) => {
      releaseProfile = resolve;
    });
    await page.route('**/users/by-username/alice', async (route) => {
      await pendingProfile;
      await route.abort();
    });
    try {
      await page.goto('/');
      await page
        .locator('#post-post-1')
        .getByRole('link', { name: 'Alice Mock', exact: true })
        .hover();
      const loading = page.getByRole('status', { name: 'Loading profile', exact: true });
      await expect(loading).toBeVisible();
      const bone = loading.locator('.skeleton-shimmer').first();
      expect(
        await bone.evaluate((element) => getComputedStyle(element, '::after').animationName),
      ).toBe('skeleton-wave');
      const initialPosition = await bone.evaluate(
        (element) => getComputedStyle(element, '::after').transform,
      );
      await expect
        .poll(() => bone.evaluate((element) => getComputedStyle(element, '::after').transform))
        .not.toBe(initialPosition);
      await page.screenshot({ path: 'test-results/skeleton-wave.png' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect(
        await bone.evaluate((element) => getComputedStyle(element, '::after').animationName),
      ).toBe('none');
    } finally {
      releaseProfile();
    }
  });

  test('GIF picker searches the provider and attaches a selection without publishing', async ({
    authenticatedPage: page,
  }) => {
    await page.route('https://api.giphy.com/v1/gifs/**', async (route) => {
      const search = new URL(route.request().url()).searchParams.get('q');
      await route.fulfill({
        json: {
          data: [
            {
              id: search ? 'dog' : 'cat',
              title: search ? 'Dancing dog' : 'Happy cat',
              images: {
                original: {
                  url: `https://media1.giphy.com/${search ? 'dog' : 'cat'}.gif?cid=selection`,
                },
                fixed_width_small: { url: 'https://media2.giphy.com/preview.gif' },
              },
            },
          ],
          pagination: { total_count: 1 },
        },
      });
    });
    await page.goto('/');
    await page.getByTitle('Add GIF', { exact: true }).first().click();
    const picker = page.getByRole('dialog', { name: 'GIF picker' });
    await expect(picker.getByRole('button', { name: 'Select Happy cat' })).toBeVisible();
    await picker.getByRole('searchbox', { name: 'Search GIFs' }).fill('dancing dog');
    const dog = picker.getByRole('button', { name: 'Select Dancing dog' });
    await expect(dog).toBeVisible();
    await page.screenshot({ path: 'test-results/gif-picker.png' });
    await dog.click();
    await expect(picker).toBeHidden();
    await expect(
      page.locator('img[src="https://media1.giphy.com/dog.gif?cid=selection"]'),
    ).toBeVisible();
  });

  test('comment Report is red and options dismiss on outside input or Escape', async ({
    authenticatedPage: page,
  }) => {
    await mockApi(page, '/posts/post-1/comments?**', {
      json: {
        comments: [
          {
            id: 'comment-1',
            userId: 'usr-alice',
            author: 'Alice Mock',
            handle: 'alice',
            text: 'Comment menu regression',
            createdAt: new Date().toISOString(),
          },
        ],
        nextCursor: null,
      },
    });
    await page.goto('/');
    await page
      .locator('#post-post-1')
      .getByRole('button', { name: 'View comments', exact: true })
      .click();
    const comment = page.getByText('Comment menu regression');
    await expect(comment).toBeVisible();
    const trigger = page.getByTitle('Options', { exact: true });
    await trigger.click();
    const menu = page.getByRole('menu', { name: 'Comment actions' });
    const report = menu.getByRole('button', { name: 'Report', exact: true });
    await expect(report).toHaveCSS('color', 'oklch(0.704 0.191 22.216)');
    await comment.click();
    await expect(menu).toBeHidden();
    await expect(comment).toBeVisible();
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(comment).toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('renders the same feed on /feed', async ({ authenticatedPage: page }) => {
    await page.goto('/feed');

    await expect(page.getByText('Hello from the mocked feed!')).toBeVisible();
  });

  test('shows the sidebar navigation on the feed', async ({ authenticatedPage: page }) => {
    await page.goto('/');

    // Wait for the page and navigation container to be fully loaded
    await expect(page.getByText('Hello from the mocked feed!')).toBeVisible();
    await expect(page.getByRole('navigation').first()).toBeVisible();

    for (const label of ['Home', 'Search', 'Music Hub', 'Message', 'Notifications', 'Create']) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^(${label}|Reels)$`, 'i') }).first(),
      ).toBeVisible();
    }
  });

  test('navigates to notifications via the sidebar', async ({ authenticatedPage: page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Notifications', exact: true }).first().click();

    await expect(page).toHaveURL(/\/notifications$/);
  });
});
