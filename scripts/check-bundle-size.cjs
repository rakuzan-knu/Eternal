'use strict';

const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../frontend/dist');

// Budgets in Bytes
const MAX_SINGLE_JS_BYTES = 600 * 1024; // 600 KB
const MAX_TOTAL_BUNDLE_BYTES = 2500 * 1024; // 2.5 MB

if (!fs.existsSync(distDir)) {
  console.error(`[check-bundle-size] Error: Build output directory not found at ${distDir}`);
  process.exit(1);
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(distDir);
const jsFiles = allFiles.filter((f) => f.endsWith('.js'));
const cssFiles = allFiles.filter((f) => f.endsWith('.css'));

let totalSize = 0;
let hasViolation = false;

console.log('[check-bundle-size] Auditing production build assets...\n');

jsFiles.forEach((file) => {
  const stats = fs.statSync(file);
  const relPath = path.relative(distDir, file);
  totalSize += stats.size;

  if (stats.size > MAX_SINGLE_JS_BYTES) {
    console.error(
      `\u274c [VIOLATION] Single JS asset '${relPath}' size (${(stats.size / 1024).toFixed(
        2,
      )} KB) exceeds budget limit (${(MAX_SINGLE_JS_BYTES / 1024).toFixed(2)} KB)`,
    );
    hasViolation = true;
  } else {
    console.log(
      `  - JS '${relPath}': ${(stats.size / 1024).toFixed(2)} KB (budget: ${(
        MAX_SINGLE_JS_BYTES / 1024
      ).toFixed(2)} KB)`,
    );
  }
});

cssFiles.forEach((file) => {
  const stats = fs.statSync(file);
  const relPath = path.relative(distDir, file);
  totalSize += stats.size;
  console.log(`  - CSS '${relPath}': ${(stats.size / 1024).toFixed(2)} KB`);
});

console.log(
  `\n[check-bundle-size] Total Bundle Size: ${(totalSize / 1024).toFixed(2)} KB (budget: ${(
    MAX_TOTAL_BUNDLE_BYTES / 1024
  ).toFixed(2)} KB)`,
);

if (totalSize > MAX_TOTAL_BUNDLE_BYTES) {
  console.error(
    `\u274c [VIOLATION] Total bundle size (${(totalSize / 1024).toFixed(
      2,
    )} KB) exceeds total budget (${(MAX_TOTAL_BUNDLE_BYTES / 1024).toFixed(2)} KB)`,
  );
  hasViolation = true;
}

if (hasViolation) {
  console.error('\n\u274c Bundle size budget enforcement failed!');
  process.exit(1);
} else {
  console.log('\n\u2705 All bundle size budget checks passed!');
}
