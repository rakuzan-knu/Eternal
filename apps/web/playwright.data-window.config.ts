import { defineConfig } from '@playwright/test';
import base from './playwright.performance.config';

export default defineConfig({
  ...base,
  testMatch: ['data-window-performance.spec.ts'],
  testIgnore: [],
  timeout: 480_000,
  globalTimeout: 900_000,
  outputDir: 'test-results-data-window',
  reporter: [['list']],
  use: { ...base.use, trace: 'off' },
});
