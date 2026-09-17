import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    target: 'es2022',
    legalComments: 'none',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
  },
  resolve: {
    alias: {
      zod: path.resolve(__dirname, './node_modules/zod'),
      '@': path.resolve(__dirname, './src'),
      '@backend/common/contracts': path.resolve(
        __dirname,
        '../../packages/shared/contracts/src/index.ts',
      ),
      '@backend/messenger/events/ws-events': path.resolve(
        __dirname,
        '../../packages/shared/socket/src/events.ts',
      ),
      '@backend': path.resolve(__dirname, '../backend/src'),
      '@common/contracts': path.resolve(__dirname, '../../packages/shared/contracts/src/index.ts'),
      '@common': path.resolve(__dirname, '../backend/src/common'),
      '@shared/contracts': path.resolve(__dirname, '../../packages/shared/contracts/src/index.ts'),
      '@shared/utils': path.resolve(__dirname, '../../packages/shared/utils/src/index.ts'),
      '@shared/crypto': path.resolve(__dirname, '../../packages/shared/crypto/src/index.ts'),
      '@shared/socket': path.resolve(__dirname, '../../packages/shared/socket/src/index.ts'),
      '@shared/stores': path.resolve(__dirname, '../../packages/shared/stores/src/index.ts'),
      '@shared/api-client': path.resolve(
        __dirname,
        '../../packages/shared/api-client/src/index.ts',
      ),
      '@shared/ui-primitives': path.resolve(
        __dirname,
        '../../packages/shared/ui-primitives/src/index.ts',
      ),
      '@social-network/text-pipeline': path.resolve(
        __dirname,
        '../../packages/text-pipeline/src/index.ts',
      ),
      '@social-network/msg-codec': path.resolve(__dirname, '../../packages/msg-codec/src/index.ts'),
      '@social-network/blinded-crypto': path.resolve(
        __dirname,
        '../../packages/blinded-crypto/src/index.ts',
      ),
      '@social-network/feed-score': path.resolve(
        __dirname,
        '../../packages/feed-score/src/index.ts',
      ),
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
              normalizedId.includes('/character-entities') ||
              normalizedId.includes('/trough') ||
              normalizedId.includes('/zwitch') ||
              normalizedId.includes('/ccount') ||
              normalizedId.includes('/devlop') ||
              normalizedId.includes('/trim-lines') ||
              normalizedId.includes('/bail') ||
              normalizedId.includes('/longest-streak') ||
              normalizedId.includes('/is-plain-obj') ||
              normalizedId.includes('/markdown-table')
            ) {
              return 'vendor-markdown';
            }
            if (normalizedId.includes('/html-to-image/')) {
              return 'vendor-html-to-image';
            }
            if (
              normalizedId.includes('/prismjs/') ||
              normalizedId.includes('/prism-react-renderer/')
            ) {
              return 'vendor-prism';
            }
            if (normalizedId.includes('/axios/')) {
              return 'vendor-http';
            }
            if (normalizedId.includes('/wavesurfer.js/')) {
              return 'vendor-wavesurfer';
            }
            if (normalizedId.includes('/hls.js/')) {
              return 'vendor-hls';
            }
            if (normalizedId.includes('/@radix-ui/')) {
              return 'vendor-radix';
            }
            if (normalizedId.includes('/framer-motion/') || normalizedId.includes('/motion/')) {
              return 'vendor-motion';
            }
            return 'vendor-libs';
          }
        },
      },
    },
  },
});
