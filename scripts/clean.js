#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TARGETS = [
  {
    label: 'node_modules',
    paths: ['node_modules', 'backend/node_modules', 'frontend/node_modules'],
  },
  {
    label: 'build output',
    paths: ['backend/dist', 'frontend/dist', 'backend/coverage', 'frontend/coverage', 'coverage'],
  },
  {
    label: 'cache files',
    paths: [
      'backend/.eslintcache',
      'frontend/.eslintcache',
      '.cache',
      'backend/node_modules/.cache',
      'frontend/node_modules/.cache',
    ],
  },
  { label: 'storybook-static', paths: ['frontend/storybook-static'] },
];

function dirSize(dirPath) {
  let size = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += dirSize(full);
      } else if (entry.isFile()) {
        size += fs.statSync(full).size;
      }
    }
  } catch {
    return 0;
  }
  return size;
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

function removeDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');

  console.log('[clean] Scanning for cleanable targets...\n');

  let totalFreed = 0;
  let removedCount = 0;

  for (const target of TARGETS) {
    for (const targetPath of target.paths) {
      const fullPath = path.join(rootDir, targetPath);
      if (!fs.existsSync(fullPath)) continue;

      const size = dirSize(fullPath);
      if (size === 0 && !fs.statSync(fullPath).isDirectory?.()) continue;

      if (dryRun || verbose) {
        console.log(`  ${dryRun ? '[dry-run]' : '[remove]'} ${targetPath} (${formatSize(size)})`);
      }

      if (!dryRun) {
        removeDir(fullPath);
      }

      totalFreed += size;
      removedCount++;
    }
  }

  if (dryRun) {
    console.log(`\n[clean] Would free ${formatSize(totalFreed)} from ${removedCount} location(s).`);
    console.log('[clean] Run without --dry-run to actually clean.');
  } else {
    console.log(`[clean] Removed ${removedCount} location(s), freed ${formatSize(totalFreed)}.`);
  }

  if (args.includes('--prune')) {
    console.log('\n[clean] Running docker system prune...');
    try {
      execSync('docker system prune -f', { stdio: 'inherit', cwd: rootDir });
      execSync('docker volume prune -f', { stdio: 'inherit', cwd: rootDir });
    } catch {
      console.log('[clean] Docker not available, skipping prune.');
    }
  }
}

main();
