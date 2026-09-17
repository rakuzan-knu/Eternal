import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
