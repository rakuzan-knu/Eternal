#!/usr/bin/env node
/**
 * text-pipeline micro-benchmark: LEGACY (sanitize-html + safe-regex scanners
 * ported verbatim) vs NEW (@social-network/text-pipeline portable core).
 *
 * Prints a console table and writes benches/report.json for CI tracking.
 * Fails with exit 1 on output-contract violations.
 *
 * Run: pnpm --filter @social-network/text-pipeline bench
 */
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const sanitizeHtml = require('sanitize-html');
const pipe = require('../dist/index.js');

// LEGACY ports (verbatim logic)

// safe-regex.util.ts inner loops (budget wrapper excluded on both sides —
// the core is ReDoS-impossible by construction and needs none).
function legacyIsHashtagChar(ch) {
  const code = ch.charCodeAt(0);
  if (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95
  )
    return true;
  if (code >= 0x0400 && code <= 0x04ff) return true;
  return false;
}
function legacyIsUsernameChar(ch) {
  const code = ch.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 46 ||
    code === 95
  );
}
function legacyIsBoundary(ch) {
  return /[\s!?,;:({[<]/.test(ch);
}
function legacyExtractHashtags(text) {
  const input = text.length > 10000 ? text.slice(0, 10000) : text;
  const tags = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === '#') {
      const start = i + 1;
      let end = start;
      while (end < input.length && legacyIsHashtagChar(input[end])) {
        if (end - start >= 100) break;
        end++;
      }
      if (end > start) {
        tags.push(input.slice(i, end));
        i = end;
        continue;
      }
    }
    i++;
  }
  return tags;
}
function legacyExtractMentions(text) {
  const input = text.length > 10000 ? text.slice(0, 10000) : text;
  const mentions = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === '@' && (i === 0 || legacyIsBoundary(input[i - 1]))) {
      const start = i + 1;
      let end = start;
      while (end < input.length && legacyIsUsernameChar(input[end])) {
        if (end - start >= 32) break;
        end++;
      }
      if (end > start) {
        mentions.push(input.slice(start, end));
        i = end;
        continue;
      }
    }
    i++;
  }
  return mentions;
}
// contracts/users.ts strip-all config.
function legacySanitizeText(s) {
  return sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} }).trim();
}
// Comparable rich config (same allowlist shape as the core).
const RICH_OPTS = {
  allowedTags: [
    'b',
    'strong',
    'i',
    'em',
    'a',
    'p',
    'br',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
  ],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https'],
};
function legacySanitizeRich(s) {
  return sanitizeHtml(s, RICH_OPTS);
}
// users.service.ts private levenshtein (removed): full matrix + per-row spread.
function legacyLevenshtein(a, b) {
  const str1 = (typeof a === 'string' ? a : '').slice(0, 64);
  const str2 = (typeof b === 'string' ? b : '').slice(0, 64);
  const m = str1.length;
  const n = str2.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prevRow = Array.from({ length: n + 1 }, (_, i) => i);
  const currRow = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(currRow[j - 1] + 1, prevRow[j] + 1, prevRow[j - 1] + cost);
    }
    prevRow = [...currRow];
  }
  return prevRow[n];
}

// Corpus
const POST =
  'Hey @alex и @maria_99, have you seen https://example.com/a(b)? #TypeScript #nestjs #привет ' +
  'lorem ipsum dolor sit amet '.repeat(8);
const XSS =
  '<script>alert(document.cookie)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">click</a><p>Hello <b>world</b></p><!-- c -->';
const LOREM_HTML = `<p>${'Lorem <b>ipsum</b> dolor <a href="https://example.com">sit</a> amet '.repeat(60)}</p>`;
const BIO = 'Senior dev <b>@acme</b> — coffee &amp; code <script>evil()</script>';

function percentile(sorted, p) {
  return sorted.length === 0
    ? 0
    : sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}
function stats(samples) {
  const sorted = Float64Array.from(samples).sort();
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    meanNs: mean,
    p50Ns: percentile(sorted, 50),
    p95Ns: percentile(sorted, 95),
    p99Ns: percentile(sorted, 99),
    opsPerSec: Math.round(1e9 / mean),
  };
}
function measure(fn, iters, warmup) {
  for (let i = 0; i < warmup; i++) fn(i);
  const samples = new Float64Array(iters);
  for (let i = 0; i < iters; i++) {
    const t0 = process.hrtime.bigint();
    fn(i);
    samples[i] = Number(process.hrtime.bigint() - t0);
  }
  return stats(samples);
}
function fmtNs(ns) {
  if (ns < 1000) return `${ns.toFixed(0)} ns`;
  if (ns < 1e6) return `${(ns / 1000).toFixed(2)} µs`;
  return `${(ns / 1e6).toFixed(2)} ms`;
}

function assertContracts() {
  // Security invariants on the legacy-comparable outputs.
  for (const bad of [XSS, BIO]) {
    for (const out of [pipe.sanitizeText(bad), pipe.sanitizeRich(bad)]) {
      if (/<script/i.test(out) || /javascript:/i.test(out) || /\son\w+\s*=/i.test(` ${out}`)) {
        throw new Error(`XSS leak in: ${out.slice(0, 120)}`);
      }
    }
  }
  // Parity spot-checks vs legacy scanners.
  for (const t of [POST, '@a,@b #x #привет email#t', 'no tokens here']) {
    const a = JSON.stringify(legacyExtractMentions(t));
    const b = JSON.stringify(pipe.extractMentions(t));
    const c = JSON.stringify(legacyExtractHashtags(t));
    const d = JSON.stringify(pipe.extractHashtags(t));
    if (a !== b || c !== d) throw new Error(`extract parity mismatch on ${JSON.stringify(t)}`);
  }
  console.log('contracts: OK — no XSS leaks, extract parity with legacy scanners');
}

function main() {
  console.log('===============================================================');
  console.log(' text-pipeline bench: LEGACY (sanitize-html + scanners) vs NEW (core)');
  console.log(` node ${process.version} ${process.platform}-${process.arch}`);
  console.log('===============================================================\n');
  assertContracts();

  const W = 5000;
  const rows = [];
  const add = (c, op, l, n) => rows.push({ case: c, op, legacy: l, next: n });

  add(
    'strip-all/post',
    'sanitize',
    measure(() => legacySanitizeText(POST), 20000, W),
    measure(() => pipe.sanitizeText(POST), 20000, W),
  );
  add(
    'strip-all/bio',
    'sanitize',
    measure(() => legacySanitizeText(BIO), 20000, W),
    measure(() => pipe.sanitizeText(BIO), 20000, W),
  );
  add(
    'strip-all/5k-html',
    'sanitize',
    measure(() => legacySanitizeText(LOREM_HTML), 3000, 500),
    measure(() => pipe.sanitizeText(LOREM_HTML), 3000, 500),
  );
  add(
    'rich/post',
    'sanitize',
    measure(() => legacySanitizeRich(POST), 20000, W),
    measure(() => pipe.sanitizeRich(POST), 20000, W),
  );
  add(
    'rich/xss',
    'sanitize',
    measure(() => legacySanitizeRich(XSS), 20000, W),
    measure(() => pipe.sanitizeRich(XSS), 20000, W),
  );
  add(
    'extract/post',
    'mentions',
    measure(() => legacyExtractMentions(POST), 40000, W),
    measure(() => pipe.extractMentions(POST), 40000, W),
  );
  add(
    'extract/post',
    'hashtags',
    measure(() => legacyExtractHashtags(POST), 40000, W),
    measure(() => pipe.extractHashtags(POST), 40000, W),
  );
  add(
    'combo/post',
    'san+extr',
    measure(
      () => {
        legacySanitizeText(POST);
        legacyExtractMentions(POST);
        legacyExtractHashtags(POST);
      },
      20000,
      W,
    ),
    measure(
      () => {
        pipe.sanitizeText(POST);
        pipe.extractMentions(POST);
        pipe.extractHashtags(POST);
      },
      20000,
      W,
    ),
  );
  add(
    'full/post',
    'prc+spam',
    measure(
      () => {
        legacySanitizeText(POST);
        legacyExtractMentions(POST);
        legacyExtractHashtags(POST);
      },
      20000,
      W,
    ),
    measure(() => pipe.processText(POST, { mode: 'text' }), 20000, W),
  );

  // Fuzzy search path: full-matrix legacy vs bounded core.
  const TYPO_NAMES = [
    'aleksandr',
    'ekaterina',
    'muhammad',
    'alexander_the_great_1999',
    'x',
    'constatine',
    'maria_99',
    'dmitry',
    'a',
    's vyrazheniem',
  ];
  const LONG_A = 'a'.repeat(64);
  const LONG_B = 'a'.repeat(60) + 'bbbb';
  // Contract gate: identical <=2 decisions.
  for (const n of TYPO_NAMES) {
    if (legacyLevenshtein('aleks', n) <= 2 !== pipe.levenshtein('aleks', n, 2) <= 2) {
      throw new Error(`levenshtein decision mismatch on ${n}`);
    }
  }
  add(
    'fuzzy/names',
    'levenshtein',
    measure(
      () => {
        for (const n of TYPO_NAMES) legacyLevenshtein('aleks', n);
      },
      20000,
      W,
    ),
    measure(
      () => {
        for (const n of TYPO_NAMES) pipe.levenshtein('aleks', n, 2);
      },
      20000,
      W,
    ),
  );
  add(
    'fuzzy/64ch',
    'levenshtein',
    measure(() => legacyLevenshtein(LONG_A, LONG_B), 2000, 200),
    measure(() => pipe.levenshtein(LONG_A, LONG_B, 2), 2000, 200),
  );

  console.log('\n------------------ RESULTS (mean | p99 | speedup) ------------------');
  for (const r of rows) {
    const speed = r.legacy.meanNs / r.next.meanNs;
    console.log(
      `${r.case.padEnd(18)} ${r.op.padEnd(9)} ` +
        `legacy ${fmtNs(r.legacy.meanNs).padStart(10)} (p99 ${fmtNs(r.legacy.p99Ns).padStart(10)})  |  ` +
        `new ${fmtNs(r.next.meanNs).padStart(10)} (p99 ${fmtNs(r.next.p99Ns).padStart(10)})  |  ` +
        `x${speed.toFixed(2)}`,
    );
  }
  console.log('-------------------------------------------------------------------\n');

  const report = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    rows: rows.map((r) => ({
      case: r.case,
      op: r.op,
      legacyNs: {
        mean: r.legacy.meanNs,
        p50: r.legacy.p50Ns,
        p95: r.legacy.p95Ns,
        p99: r.legacy.p99Ns,
        ops: r.legacy.opsPerSec,
      },
      newNs: {
        mean: r.next.meanNs,
        p50: r.next.p50Ns,
        p95: r.next.p95Ns,
        p99: r.next.p99Ns,
        ops: r.next.opsPerSec,
      },
      speedup: r.legacy.meanNs / r.next.meanNs,
    })),
  };
  const outPath = path.join(__dirname, 'report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`report written: ${outPath}`);
}

main();
