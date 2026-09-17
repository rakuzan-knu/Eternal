#!/usr/bin/env node
/**
 * check-portable: guards the portable packages against Node.js-only APIs.
 *
 * Scans packages/<pkg>/src for imports/globals that break web bundlers,
 * React Native / Hermes, and Electron renderer:
 *   - node:* imports, require('node:...')
 *   - Buffer (use Uint8Array), process.*, __dirname/__filename
 *   - WebCrypto / TextEncoder are ALLOWED (universal since RN 0.73 / all browsers)
 *
 * Domain packages (native, backend, frontend) are intentionally NOT scanned —
 * only the four portable cores listed below.
 *
 * Run: node scripts/ci/check-portable.cjs (also wired into native.yml CI)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const PACKAGES = ['msg-codec', 'text-pipeline', 'feed-score', 'blinded-crypto'];

const RULES = [
  { name: 'node:-import', re: /(?:import|export)[^'"]*from\s*['"]node:/ },
  { name: 'node-require', re: /require\(\s*['"]node:/ },
  { name: 'Buffer-global', re: /(^|[^a-zA-Z0-9_$])Buffer(?![a-zA-Z0-9_$])/ },
  { name: 'process-env', re: /process\.(env|argv|exit|cwd)\b/ },
  { name: 'dirname', re: /__(dirname|filename)\b/ },
];

let violations = 0;
for (const pkg of PACKAGES) {
  const src = path.join(ROOT, 'packages', pkg, 'src');
  const files = fs.readdirSync(src).filter((f) => f.endsWith('.ts'));
  for (const file of files) {
    const full = path.join(src, file);
    const text = fs.readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); // strip block comments (docs mention Buffer legitimately)
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      // Allow mentioning forbidden names inside line comments.
      const code = line.split('//')[0];
      for (const rule of RULES) {
        if (rule.re.test(code)) {
          // Buffer is allowed when only named in a comment-free type position
          // like `Uint8Array | Buffer`? No — portable cores take Uint8Array
          // only. Any Buffer mention is a violation, no exceptions.
          console.error(
            `portable violation [${rule.name}]: packages/${pkg}/src/${file}:${i + 1}: ${line.trim()}`,
          );
          violations += 1;
        }
      }
    });
  }
}

if (violations > 0) {
  console.error(
    `\ncheck-portable: ${violations} violation(s). Portable cores must not use Node.js APIs.`,
  );
  process.exit(1);
}
console.log('check-portable: OK — 4 portable cores are Node-free');
