import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['apps/web/vitest.config.ts', 'apps/backend/vitest.config.ts'],
  },
});
