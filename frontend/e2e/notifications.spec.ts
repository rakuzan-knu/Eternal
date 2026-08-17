import { test, expect } from './fixtures';

test.describe('Notifications (authenticated, mocked API)', () => {
  test('renders the notifications placeholder page', async ({ authenticatedPage: page }) => {
    await page.goto('/notifications');

    await expect(page.getByText('List of your notifications')).toBeVisible();
    await expect(page).toHaveURL(/\/notifications$/);
  });

  test('notifications page is reachable from the sidebar on the feed', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Notifications', exact: true }).first().click();

    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.getByText('List of your notifications')).toBeVisible();
  });

  test('keeps the sidebar notifications link in sync with the current route', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/search');
    await page.getByRole('link', { name: 'Notifications', exact: true }).first().click();
    await page.goBack();

    await expect(page).toHaveURL(/\/search$/);
  });
});
