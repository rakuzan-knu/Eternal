import { defineConfig, devices } from '@playwright/test';
import design from './playwright.design.config';

export default defineConfig({
  ...design,
  testMatch: ['platforms.spec.ts', 'interactions.spec.ts'],
  testIgnore: [],
  outputDir: 'test-results-platforms',
  reporter: [['list'], ['html', { outputFolder: 'playwright-platforms-report', open: 'never' }]],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
    { name: 'iphone-11-webkit-emulation', use: { ...devices['iPhone 11'], browserName: 'webkit' } },
  ],
});
