/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    // Contract tests need a real Node environment and run via test:contract;
    // e2e/ specs belong to Playwright, not Vitest.
    exclude: [...configDefaults.exclude, 'src/contract/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.stories.{ts,tsx}',
      ],
      thresholds: {
        lines: 60,
        functions: 40,
        branches: 55,
        statements: 60,
        // Per-layer ratchet: values sit just below the current measured
        // coverage so regressions fail CI while room to improve remains.
        'src/shared/**': { lines: 78, statements: 78, branches: 77, functions: 65 },
        'src/entities/**': { lines: 77, statements: 77, branches: 72, functions: 63 },
        'src/app/**': { lines: 92, statements: 92, branches: 85, functions: 72 },
        'src/pages/**': { lines: 81, statements: 81, branches: 69, functions: 60 },
        'src/widgets/**': { lines: 86, statements: 86, branches: 68, functions: 45 },
        'src/features/**': { lines: 61, statements: 61, branches: 65, functions: 36 },
      },
    },
  },
});
