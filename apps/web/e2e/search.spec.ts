import { test, expect, mockApi } from './fixtures';

test.describe('Search (authenticated, mocked API)', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await mockApi(authenticatedPage, '/users/search?**', {
      json: [
        {
          id: 'usr-carol',
          username: 'carol',
          displayName: 'Carol Mock',
          avatar: null,
          followersCount: 5,
        },
      ],
    });
    await mockApi(authenticatedPage, '/posts/search?**', {
      json: {
        data: [
          {
            id: 'post-search-1',
            authorId: 'usr-carol',
            author: 'Carol Mock',
            handle: 'carol',
            text: 'A mocked post matching the search query',
            createdAt: new Date().toISOString(),
          },
        ],
        meta: { nextCursor: null },
      },
    });
  });

  test('renders the search page with search input and tabs', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/search');

    await expect(page.getByPlaceholder('Search users, #hashtags, posts...')).toBeVisible();

    // Tabs only appear once a query is active (debounced).
    await page.getByPlaceholder('Search users, #hashtags, posts...').fill('carol');
    for (const tab of ['All', 'People', 'Posts', 'Hashtags', 'Media']) {
      await expect(page.getByRole('button', { name: tab, exact: true }).first()).toBeVisible({
        timeout: 15_000,
      });
    }

    await page.getByRole('button', { name: 'People', exact: true }).first().click();
    await expect(page).toHaveURL(/tab=People/, { timeout: 15_000 });
  });

  test('shows mocked people and post results for a query', async ({ authenticatedPage: page }) => {
    await page.goto('/search');

    await page.getByPlaceholder('Search users, #hashtags, posts...').fill('carol');

    await expect(page.getByText('Carol Mock').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('A mocked post matching the search query').first()).toBeVisible();
  });

  test('updates the URL with the query string when searching', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/search');

    await page.getByPlaceholder('Search users, #hashtags, posts...').fill('carol');

    await expect(page).toHaveURL(/q=carol/, { timeout: 15_000 });
  });
});
