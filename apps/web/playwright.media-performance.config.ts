import { defineConfig } from '@playwright/test';
import base from './playwright.performance.config';

export default defineConfig({
  ...base,
  testMatch: ['media-performance.spec.ts'],
  testIgnore: [],
  timeout: 240_000,
  globalTimeout: 900_000,
  outputDir: 'test-results-media-performance',
  reporter: [['list']],
  use: { ...base.use, trace: 'off' },
});
