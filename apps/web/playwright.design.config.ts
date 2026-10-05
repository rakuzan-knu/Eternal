import { defineConfig } from '@playwright/test';

// Windows is the canonical screenshot environment. Other platforms can review
// stories with the same tests after explicitly creating their own baselines.
export default defineConfig({
  testDir: './e2e/design',
  // Interaction journeys run once per engine in the platform matrix.
  testIgnore: ['platforms.spec.ts', 'interactions.spec.ts'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Keep screenshot and performance samples from competing for CPU.
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000, toHaveScreenshot: { animations: 'disabled', caret: 'hide' } },
  snapshotPathTemplate: '{testDir}/snapshots/{arg}-{platform}{ext}',
  reporter: [['list'], ['html', { outputFolder: 'playwright-design-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:6006',
    browserName: 'chromium',
    viewport: { width: 1280, height: 900 },
    contextOptions: { reducedMotion: 'reduce' },
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'pnpm exec vite preview --outDir storybook-static --host 127.0.0.1 --port 6006 --strictPort',
      url: 'http://127.0.0.1:6006/iframe.html',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm exec vite preview --outDir dist --host 127.0.0.1 --port 6007 --strictPort',
      url: 'http://127.0.0.1:6007',
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
