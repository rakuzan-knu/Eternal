import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prismaBin = path.join(__dirname, '..', 'backend', 'node_modules', '.bin', 'prisma');
const exists = fs.existsSync(prismaBin) || fs.existsSync(prismaBin + '.cmd');

if (exists) {
  execSync('npm run db:generate -w backend', { stdio: 'inherit' });
} else {
  console.log('[postinstall] backend deps not installed in this scope, skipping prisma generate');
}
