import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import * as path from 'node:path';

const jestMockHoistPlugin = {
  name: 'jest-mock-hoist-compatibility',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if ((id.endsWith('.spec.ts') || id.endsWith('.e2e-spec.ts')) && code.includes('jest.mock(')) {
      return {
        code: code.replace(/\bjest\.mock\(/g, 'vi.mock('),
        map: null,
      };
    }
  },
};

export default defineConfig({
  plugins: [
    jestMockHoistPlugin,
    tsconfigPaths(),
    swc.vite({
      jsc: {
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, './src'),
      '@common/contracts': path.resolve(__dirname, './src/common/contracts/index.ts'),
      '@common': path.resolve(__dirname, './src/common'),
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
      '@social-network/native': path.resolve(__dirname, '../../packages/native/src/index.ts'),
      '@social-network/msg-codec': path.resolve(__dirname, '../../packages/msg-codec/src/index.ts'),
      '@social-network/text-pipeline': path.resolve(
        __dirname,
        '../../packages/text-pipeline/src/index.ts',
      ),
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
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    passWithNoTests: true,
  },
});
