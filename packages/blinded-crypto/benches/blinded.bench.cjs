#!/usr/bin/env node
/**
 * blinded-crypto micro-benchmark: LEGACY (BigInt binary loop, verbatim port
 * of BlindedSfuService.modPow) vs NEW (sliding-window modPow core).
 *
 * Workload: real 2048-bit RSA sign (private exponent) + verify (e=65537),
 * key generated once at startup. Prints a table, writes benches/report.json.
 *
 * Run: pnpm --filter @social-network/blinded-crypto bench
 */
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const core = require('../dist/index.js');

// LEGACY — verbatim port of backend blinded-sfu.service.ts private modPow.
function legacyModPow(base, exp, mod) {
  if (mod === 1n) return 0n;
  let res = 1n;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) {
      res = (res * b) % mod;
    }
    e >>= 1n;
    b = (b * b) % mod;
  }
  return res;
}

// Harness
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

function main() {
  console.log('===============================================================');
  console.log(' blinded-crypto bench: LEGACY (binary loop) vs NEW (windowed core)');
  console.log(` node ${process.version} ${process.platform}-${process.arch}`);
  console.log('===============================================================\n');

  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x10001,
  });
  const jwk = privateKey.export({ format: 'jwk' });
  const b64u = (s) => Buffer.from(s, 'base64').toString('hex');
  const n = BigInt(`0x${b64u(jwk.n)}`);
  const e = BigInt(`0x${b64u(jwk.e)}`);
  const d = BigInt(`0x${b64u(jwk.d)}`);
  const m = BigInt(`0x${crypto.randomBytes(32).toString('hex')}`) % n;
  const sig = core.modPow(m, d, n);

  // Contract gate: identical results.
  if (legacyModPow(m, d, n) !== sig) throw new Error('sign mismatch legacy vs core');
  if (legacyModPow(sig, e, n) !== m) throw new Error('verify mismatch legacy vs core');
  console.log('contracts: OK — legacy loop and windowed core agree on 2048-bit RSA\n');

  const rows = [];
  const add = (c, op, l, n2) => rows.push({ case: c, op, legacy: l, next: n2 });

  add(
    'rsa2048',
    'sign',
    measure(() => legacyModPow(m, d, n), 30, 5),
    measure(() => core.modPow(m, d, n), 30, 5),
  );
  add(
    'rsa2048',
    'verify',
    measure(() => legacyModPow(sig, e, n), 200, 20),
    measure(() => core.modPow(sig, e, n), 200, 20),
  );
  add(
    'api/sign',
    'signBlinded',
    measure(() => legacyModPow(m, d, n), 30, 5),
    measure(
      () =>
        core.signBlinded({
          nHex: n.toString(16),
          dHex: d.toString(16),
          blindedHex: m.toString(16),
        }),
      30,
      5,
    ),
  );

  console.log('------------------ RESULTS (mean | p99 | speedup) ------------------');
  for (const r of rows) {
    const speed = r.legacy.meanNs / r.next.meanNs;
    console.log(
      `${r.case.padEnd(10)} ${r.op.padEnd(11)} ` +
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
