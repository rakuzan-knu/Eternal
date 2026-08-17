import { test, expect, mockApi } from './fixtures';

const MOCK_USER = {
  id: 'usr-alice',
  username: 'alice',
  displayName: 'Alice Mock',
  bio: 'Mocked biography for the profile e2e test',
  avatar: null,
  banner: null,
  followersCount: 42,
  followingCount: 17,
  createdAt: '2024-01-01T00:00:00.000Z',
};

test.describe('Profile (authenticated, mocked API)', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await mockApi(authenticatedPage, '/users/by-username/alice', { json: MOCK_USER });
  });

  test('renders the profile header for /profile/:username', async ({ authenticatedPage: page }) => {
    await page.goto('/profile/alice');

    await expect(page.getByText('Alice Mock').first()).toBeVisible();
    await expect(page.getByText('Mocked biography for the profile e2e test').first()).toBeVisible();
    await expect(page).toHaveURL(/\/profile\/alice$/);
  });

  test('renders the profile via the /:username route', async ({ authenticatedPage: page }) => {
    await page.goto('/alice');

    await expect(page.getByText('Alice Mock').first()).toBeVisible();
    await expect(page).toHaveURL(/\/alice$/);
  });

  test('shows an error state when the profile lookup fails', async ({
    authenticatedPage: page,
  }) => {
    await mockApi(page, '/users/by-username/ghost', { status: 404, json: {} });

    await page.goto('/profile/ghost');

    await expect(page.getByText('Alice Mock')).toHaveCount(0);
    await expect(page.getByText('Mocked biography for the profile e2e test')).toHaveCount(0);
  });
});
