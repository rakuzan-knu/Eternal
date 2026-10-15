import { defineConfig } from '@playwright/test';
import base from './playwright.performance.config';

export default defineConfig({
  ...base,
  use: {
    ...base.use,
    baseURL: `http://127.0.0.1:${process.env.MEMORY_PORT ?? 5173}`,
    trace: 'off',
  },
  webServer: {
    ...base.webServer,
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${process.env.MEMORY_PORT ?? 5173}`,
    url: `http://127.0.0.1:${process.env.MEMORY_PORT ?? 5173}`,
  },
  testMatch: ['memory-performance.spec.ts'],
  testIgnore: [],
  timeout: (Number(process.env.MEMORY_IDLE_SECONDS ?? 60) + 120) * 1000,
  globalTimeout: (Number(process.env.MEMORY_IDLE_SECONDS ?? 60) + 180) * 1000,
  outputDir: process.env.MEMORY_OUTPUT_DIR ?? 'test-results-memory',
  reporter: [['list']],
});
