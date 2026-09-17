#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const WORKSPACES = [
  { name: 'backend', dir: path.join(rootDir, 'backend') },
  { name: 'frontend', dir: path.join(rootDir, 'frontend') },
];

function readEnvExample(examplePath) {
  if (!fs.existsSync(examplePath)) return [];
  const content = fs.readFileSync(examplePath, 'utf8');
  const keys = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    if (key) keys.push({ key, optional: trimmed.includes('# optional') });
  }
  return keys;
}

function main() {
  console.log('[check-env] Validating environment files...\n');

  let hasError = false;

  for (const ws of WORKSPACES) {
    const envPath = path.join(ws.dir, '.env');
    const examplePath = path.join(ws.dir, '.env.example');

    if (!fs.existsSync(examplePath)) {
      console.log(`  [skip] ${ws.name}/.env.example not found`);
      continue;
    }

    const requiredKeys = readEnvExample(examplePath);
    if (requiredKeys.length === 0) continue;

    if (!fs.existsSync(envPath)) {
      console.error(
        `  [missing] ${ws.name}/.env does not exist (expected ${requiredKeys.length} keys)`,
      );
      hasError = true;
      continue;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envKeys = new Set();
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      envKeys.add(trimmed.substring(0, eqIdx).trim());
    }

    const missing = requiredKeys.filter((k) => !k.optional && !envKeys.has(k.key));
    const empty = requiredKeys.filter((k) => {
      if (k.optional && !envKeys.has(k.key)) return false;
      const line = envContent.split('\n').find((l) => l.trim().startsWith(k.key + '='));
      if (!line) return false;
      const val = line.split('=').slice(1).join('=').trim();
      return !val || val === '""' || val === "''";
    });

    if (missing.length > 0) {
      console.error(
        `  [missing] ${ws.name}/.env missing keys: ${missing.map((m) => m.key).join(', ')}`,
      );
      hasError = true;
    } else if (empty.length > 0) {
      console.error(`  [empty] ${ws.name}/.env empty keys: ${empty.map((m) => m.key).join(', ')}`);
      hasError = true;
    } else {
      console.log(`  [ok] ${ws.name}/.env (${requiredKeys.length} keys validated)`);
    }
  }

  console.log('');

  if (hasError) {
    console.error('[check-env] Validation failed. Copy from .env.example and fill in values.');
    process.exit(1);
  }

  console.log('[check-env] All environment files valid.');
  process.exit(0);
}

main();
