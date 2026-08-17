/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Contract tests run in a Node environment (Pact spins up real mock servers)
 * and must not load the jsdom test setup, which patches browser-only globals.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/contract/**/*.pact.test.ts'],
  },
});
