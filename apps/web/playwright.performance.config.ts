import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Run after building with VITE_API_URL=http://127.0.0.1:3000.
export default defineConfig({
  ...base,
  testMatch: ['search-performance.spec.ts', 'search.spec.ts'],
  workers: 1,
  outputDir: 'test-results-production',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-production', open: 'never' }]],
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
