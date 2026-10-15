import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { preserveMswOriginGuard } from './msw-origin-guard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MSW regenerates this file during installation. Retain the origin protection
// from both branches in the actual worker copied into production builds.
const workerPath = path.join(
  __dirname,
  '..',
  '..',
  'apps',
  'web',
  'public',
  'mockServiceWorker.js',
);
if (fs.existsSync(workerPath)) {
  const source = fs.readFileSync(workerPath, 'utf8');
  const guarded = preserveMswOriginGuard(source);
  if (source !== guarded) fs.writeFileSync(workerPath, guarded);
}

const rootPrismaBin = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'prisma');
const backendPrismaBin = path.join(
  __dirname,
  '..',
  '..',
  'backend',
  'node_modules',
  '.bin',
  'prisma',
);
const exists =
  fs.existsSync(rootPrismaBin) ||
  fs.existsSync(rootPrismaBin + '.cmd') ||
  fs.existsSync(backendPrismaBin) ||
  fs.existsSync(backendPrismaBin + '.cmd');

if (exists) {
  try {
    execSync('pnpm --filter backend exec prisma generate', { stdio: 'inherit' });
  } catch (err) {
    console.error('[postinstall] Failed to run prisma generate:', err);
  }
} else {
  console.log('[postinstall] prisma binary not found in node_modules, skipping prisma generate');
}
