/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    target: 'es2022',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@backend': path.resolve(__dirname, '../backend/src'),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 600,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('curatedMediaCatalogPart1')) {
            return 'showcase-catalog-1';
          }
          if (normalizedId.includes('curatedMediaCatalogPart2')) {
            return 'showcase-catalog-2';
          }
          if (
            normalizedId.includes('/entities/profile/ui/') &&
            (normalizedId.includes('Badge') || normalizedId.includes('Tier'))
          ) {
            return 'profile-badges';
          }
          if (normalizedId.includes('/features/music/model/useMusicHubStore')) {
            return 'music-store';
          }

          if (id.includes('node_modules')) {
            if (normalizedId.includes('/emoji-picker-react/')) {
              return 'vendor-emoji';
            }
            if (normalizedId.includes('/lucide-react/')) {
              return 'vendor-icons';
            }
            if (
              normalizedId.includes('/socket.io-client/') ||
              normalizedId.includes('/engine.io-client/')
            ) {
              return 'vendor-socket';
            }
            if (normalizedId.includes('/@tanstack/') || normalizedId.includes('/zustand/')) {
              return 'vendor-state';
            }
            if (normalizedId.includes('/@sentry/')) {
              return 'vendor-sentry';
            }
            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/react-router/') ||
              normalizedId.includes('/node_modules/react-router-dom/') ||
              normalizedId.includes('/node_modules/scheduler/') ||
              normalizedId.includes('/node_modules/use-sync-external-store/')
            ) {
              return 'vendor-react';
            }
            if (
              normalizedId.includes('/react-hook-form/') ||
              normalizedId.includes('/zod/') ||
              normalizedId.includes('/@hookform/')
            ) {
              return 'vendor-forms';
            }
            if (normalizedId.includes('/react-virtuoso/')) {
              return 'vendor-virtuoso';
            }
            if (normalizedId.includes('/katex/')) {
              return 'vendor-katex';
            }
            if (
              normalizedId.includes('/react-markdown/') ||
              normalizedId.includes('/remark-') ||
              normalizedId.includes('/rehype-') ||
              normalizedId.includes('/micromark') ||
              normalizedId.includes('/unified') ||
              normalizedId.includes('/unist-') ||
              normalizedId.includes('/vfile') ||
              normalizedId.includes('/mdast-') ||
              normalizedId.includes('/hast-') ||
              normalizedId.includes('/property-information') ||
              normalizedId.includes('/comma-separated-tokens') ||
              normalizedId.includes('/space-separated-tokens') ||
              normalizedId.includes('/decode-named-character-reference') ||
              normalizedId.includes('/trim-lines') ||
              normalizedId.includes('/trough') ||
              normalizedId.includes('/bail') ||
              normalizedId.includes('/longest-streak') ||
              normalizedId.includes('/ccount') ||
              normalizedId.includes('/markdown-table') ||
              normalizedId.includes('/devlop')
            ) {
              return 'vendor-markdown';
            }
            if (normalizedId.includes('/wavesurfer.js/')) {
              return 'vendor-wavesurfer';
            }
            if (normalizedId.includes('/@radix-ui/')) {
              return 'vendor-radix';
            }
            if (normalizedId.includes('/framer-motion/') || normalizedId.includes('/motion/')) {
              return 'vendor-motion';
            }
            if (normalizedId.includes('/hls.js/')) {
              return 'vendor-hls';
            }
            if (
              normalizedId.includes('/prism-react-renderer/') ||
              normalizedId.includes('/prismjs/')
            ) {
              return 'vendor-prism';
            }
            if (normalizedId.includes('/html-to-image/')) {
              return 'vendor-html-to-image';
            }
            if (normalizedId.includes('/axios/')) {
              return 'vendor-http';
            }
            return 'vendor-libs';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    setupFiles: ['./src/test/polyfills.ts', './src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.d.ts', 'src/main.tsx', 'src/vite-env.d.ts'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
