import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    // Pin the API origin for the test dev server: a developer's .env may point
    // VITE_API_URL at a deployed backend, but e2e mocks must target a fixed
    // local origin (mirrored by the API_BASE default in e2e/fixtures.ts).
    env: {
      ...process.env,
      VITE_API_URL: 'http://localhost:3000',
    },
    url: 'http://localhost:5173',
    // Never reuse an already-running dev server: it may carry a different
    // VITE_API_URL from the developer's .env, which would dodge the mocks.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
