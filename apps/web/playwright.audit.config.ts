import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';
import process from 'node:process';

// A dedicated port keeps the audit independent of an existing developer server and its API origin.
export default defineConfig({
  ...baseConfig,
  testMatch: ['audit-remediation.spec.ts', 'community-workspace.spec.ts'],
  workers: 1,
  use: { ...baseConfig.use, baseURL: 'http://127.0.0.1:5183' },
  webServer: {
    ...baseConfig.webServer,
    command:
      process.env.AUDIT_PREVIEW === '1'
        ? 'pnpm exec vite preview --host 127.0.0.1 --port 5183 --strictPort'
        : 'pnpm exec vite --host 127.0.0.1 --port 5183 --strictPort',
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: false,
  },
});
