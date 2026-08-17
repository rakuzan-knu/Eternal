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

  test('renders the same feed on /feed', async ({ authenticatedPage: page }) => {
    await page.goto('/feed');

    await expect(page.getByText('Hello from the mocked feed!')).toBeVisible();
  });

  test('shows the sidebar navigation on the feed', async ({ authenticatedPage: page }) => {
    await page.goto('/');

    for (const label of ['Home', 'Search', 'Reels', 'Message', 'Notifications', 'Create']) {
      await expect(page.getByRole('link', { name: label, exact: true }).first()).toBeVisible();
    }
  });

  test('navigates to notifications via the sidebar', async ({ authenticatedPage: page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Notifications', exact: true }).first().click();

    await expect(page).toHaveURL(/\/notifications$/);
  });
});
