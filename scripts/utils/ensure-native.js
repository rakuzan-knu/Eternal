/**
 * ensure-native: guarantees workspace codec dists exist after `pnpm install`.
 *
 * Why: @social-network/msg-codec and @social-network/native ship TypeScript
 * sources; consumers (backend, docker builder) resolve the compiled dist via
 * workspace symlinks. `nest start --watch`, `tsc` and plain `node dist/...`
 * all need dist present. Building here keeps every flow working with zero
 * manual steps and zero extra CI ordering (msg-codec first — native depends
 * on its types).
 *
 * Behavior:
 *  - Skips silently when sources are absent (docker *-deps stages copy only
 *    package.json files; the builder stage compiles explicitly).
 *  - Skips packages whose dist is already built.
 *  - NEVER fails the install: a warning is printed instead.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');

/** In dependency order: cores first, native last (it links their types). */
const PACKAGES = [
  { dir: 'packages/msg-codec', filter: '@social-network/msg-codec' },
  { dir: 'packages/text-pipeline', filter: '@social-network/text-pipeline' },
  { dir: 'packages/blinded-crypto', filter: '@social-network/blinded-crypto' },
  { dir: 'packages/feed-score', filter: '@social-network/feed-score' },
  { dir: 'packages/native', filter: '@social-network/native' },
];

let skipped = true;
for (const pkg of PACKAGES) {
  const pkgDir = path.join(rootDir, pkg.dir);
  if (!fs.existsSync(path.join(pkgDir, 'src', 'index.ts'))) {
    console.log(`[ensure-native] ${pkg.dir} sources not present, skipping (docker deps stage?)`);
    continue;
  }
  if (
    fs.existsSync(path.join(pkgDir, 'dist', 'index.js')) &&
    fs.existsSync(path.join(pkgDir, 'dist', 'index.d.ts'))
  ) {
    continue;
  }
  skipped = false;
  try {
    console.log(`[ensure-native] building ${pkg.filter}...`);
    execSync(`pnpm --filter ${pkg.filter} build`, { stdio: 'inherit', cwd: rootDir });
  } catch (err) {
    console.error(`[ensure-native] WARNING: ${pkg.filter} build failed, continuing install:`, err);
  }
}

if (skipped) {
  console.log('[ensure-native] all codec dists already built, skipping');
}
