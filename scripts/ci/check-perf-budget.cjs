#!/usr/bin/env node
/**
 * check-perf-budget: micro-benchmark regression gate for the portable cores.
 *
 * For each package bench it:
 *  1. snapshots the COMMITTED benches/report.json as the baseline,
 *  2. runs the bench fresh (overwrites report.json),
 *  3. fails when any row's mean exceeds baseline mean x PERF_MAX_REGRESSION
 *     (default 3 — generous for noisy CI runners; catches real algorithmic
 *     regressions, not jitter).
 *
 * To bless a deliberate slowdown (or a faster baseline), regenerate and
 * commit the new report.json — the diff is reviewed like code.
 *
 * Run: pnpm perf:gates (also wired into native.yml CI, artifacts uploaded)
 */
'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const MAX_REGRESSION = Number(process.env.PERF_MAX_REGRESSION ?? 3);

const SUITES = [
  { name: 'msg-codec', script: 'bench:msg-codec', report: 'packages/native/benches/report.json' },
  {
    name: 'text-pipeline',
    script: 'bench:text',
    report: 'packages/text-pipeline/benches/report.json',
  },
  {
    name: 'blinded-crypto',
    script: 'bench:blind',
    report: 'packages/blinded-crypto/benches/report.json',
  },
  { name: 'feed-score', script: 'bench:feed', report: 'packages/feed-score/benches/report.json' },
];

function keyOf(row) {
  return `${row.case} :: ${row.op}`;
}

let failures = 0;
for (const suite of SUITES) {
  console.log(`\n=== ${suite.name} ===`);
  const abs = path.join(ROOT, suite.report);
  let baseline;
  try {
    const raw = execSync(`git show HEAD:${suite.report}`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    baseline = JSON.parse(raw);
  } catch {
    console.log(`no committed baseline for ${suite.report} — running bench without gate`);
    execSync(`pnpm ${suite.script}`, { cwd: ROOT, stdio: 'inherit' });
    continue;
  }
  execSync(`pnpm ${suite.script}`, { cwd: ROOT, stdio: 'inherit' });
  const fresh = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const baseRows = new Map(baseline.rows.map((r) => [keyOf(r), r]));
  for (const row of fresh.rows) {
    const base = baseRows.get(keyOf(row));
    if (!base) {
      console.log(`  new row (no baseline, skipping gate): ${keyOf(row)}`);
      continue;
    }
    const ratio = row.newNs.mean / Math.max(1e-9, base.newNs.mean);
    const status = ratio <= MAX_REGRESSION ? 'ok  ' : 'FAIL';
    if (ratio > MAX_REGRESSION) failures += 1;
    console.log(
      `  [${status}] ${keyOf(row)}: baseline ${(base.newNs.mean / 1000).toFixed(2)}µs -> now ${(row.newNs.mean / 1000).toFixed(2)}µs (x${ratio.toFixed(2)}, budget x${MAX_REGRESSION})`,
    );
  }
}

if (failures > 0) {
  console.error(
    `\ncheck-perf-budget: ${failures} regression(s) beyond x${MAX_REGRESSION}. Investigate or re-baseline deliberately.`,
  );
  process.exit(1);
}
console.log('\ncheck-perf-budget: OK — all rows within budget');
