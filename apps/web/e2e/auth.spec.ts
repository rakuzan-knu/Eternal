import { test, expect, mockApi } from './fixtures';

test.describe('Authentication (unauthenticated)', () => {
  test('redirects unauthenticated visitors from / to /login', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('redirects unauthenticated visitors from guarded routes to /login', async ({ page }) => {
    for (const path of ['/feed', '/profile', '/messages', '/search', '/notifications']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('renders the login form with expected fields and actions', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByPlaceholder('Email address or phone number')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeEnabled();
  });

  test('shows client-side validation errors for invalid input', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Email address or phone number').fill('not-an-email');
    await page.getByPlaceholder('Password').fill('123');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(
      page.getByText('Please enter a valid email address or phone number.'),
    ).toBeVisible();
    await expect(page.getByText('Password must contain at least 6 characters.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('shows a server error message when the backend rejects the login', async ({ page }) => {
    // The backend answers a wrong password with 401 'Invalid credentials'; the
    // token-refresh path then fails (no refresh token) and the form falls back
    // to its generic error banner.
    await mockApi(page, '/auth/login', { status: 401, json: { message: 'Invalid credentials' } });
    await page.goto('/login');

    await page.getByPlaceholder('Email address or phone number').fill('user@example.com');
    await page.getByPlaceholder('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('You entered incorrect credentials.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Find your account and log in' })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('navigates from login to register via "Create new account"', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Create new account' }).click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByPlaceholder('First name')).toBeVisible();
    await expect(page.getByPlaceholder('Last name')).toBeVisible();
    await expect(page.getByPlaceholder('Mobile number or email')).toBeVisible();
    await expect(page.getByPlaceholder('New password')).toBeVisible();
  });

  test('renders the forgot-password page from the login link', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: 'Forgot password?' }).click();

    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});
