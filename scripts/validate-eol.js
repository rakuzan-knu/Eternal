import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.md',
  '.txt',
  '.css',
  '.scss',
  '.html',
  '.htm',
  '.svg',
  '.env',
  '.env.example',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.dockerignore',
  '.gitignore',
  '.editorconfig',
  '.prettierignore',
  '.npmrc',
  '.nvmrc',
  'Dockerfile',
  'Makefile',
  'Justfile',
  '.graphql',
  '.gql',
  '.prisma',
]);

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  '.turbo',
  'storybook-static',
  '.output',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  '.DS_Store',
]);

function isTextFile(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (IGNORED_FILES.has(basename)) return false;
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (TEXT_EXTENSIONS.has(basename)) return true;

  const noExtFiles = ['Dockerfile', 'Makefile', 'Justfile', 'LICENSE', 'Rakefile', 'Gemfile'];
  if (noExtFiles.includes(basename)) return true;

  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.includes(0)) return false;
    return true;
  } catch {
    return false;
  }
}

function* walkDir(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name === '.git') continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      yield* walkDir(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function hasCRLF(filePath) {
  const content = fs.readFileSync(filePath);
  return content.includes('\r\n');
}

function getTrackedFiles() {
  try {
    const output = execSync('git ls-files', { cwd: rootDir, encoding: 'utf8' });
    return output
      .split('\n')
      .filter(Boolean)
      .map((f) => path.join(rootDir, f));
  } catch {
    return null;
  }
}

function main() {
  console.log('[validate-eol] Checking for CRLF line endings...\n');

  const trackedFiles = getTrackedFiles();
  let filesToCheck;

  if (trackedFiles) {
    filesToCheck = trackedFiles.filter(isTextFile);
  } else {
    console.log('[validate-eol] Not a git repo or git not available, scanning working tree...');
    filesToCheck = [];
    for (const file of walkDir(rootDir)) {
      if (isTextFile(file)) filesToCheck.push(file);
    }
  }

  const violations = [];

  for (const file of filesToCheck) {
    if (hasCRLF(file)) {
      violations.push(path.relative(rootDir, file));
    }
  }

  if (violations.length === 0) {
    console.log(`[validate-eol] ✅ All ${filesToCheck.length} files use LF line endings.`);
    process.exit(0);
  }

  console.error(`[validate-eol] ❌ Found ${violations.length} file(s) with CRLF line endings:\n`);
  for (const file of violations) {
    console.error(`  ✗ ${file}`);
  }
  console.error(`\n[validate-eol] Fix: run "git add --renormalize ." or convert to LF.\n`);
  process.exit(1);
}

main();
