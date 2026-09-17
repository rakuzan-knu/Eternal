#!/usr/bin/env node
/**
 * feed-score micro-benchmark: LEGACY (scoring loop ported verbatim from
 * UsersService incl. reason building) vs NEW (portable core).
 *
 * Honest framing: recommendation latency is dominated by DB/Redis IO (pools,
 * details, N×geodist roundtrips), not by this math. This bench proves the
 * core adds no CPU regression while buying determinism, testability, and
 * decay/affinity readiness. Prints a table, writes benches/report.json.
 *
 * Run: pnpm --filter @social-network/feed-score bench
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const core = require('../dist/index.js');

// LEGACY — verbatim port of the UsersService scoring block (section 6).
function legacyScore(user, distKm, city) {
  let scoreProx = 0.0;
  let proxReasonText = null;
  const allowNearby = user.allowNearby;
  if (allowNearby && distKm !== null && distKm <= 100) {
    scoreProx = Math.max(0, 1 - distKm / 100);
    if (distKm <= 10) {
      proxReasonText = 'Near you';
    } else {
      proxReasonText = city ? `From your city (${city})` : 'Near you';
    }
  }
  const mutualCount = user.mutuals.length;
  const scoreMut = Math.min(1, mutualCount / 5);
  const scorePop = Math.min(1, Math.log10(user.followersCount + 1) / 4);
  const finalScore = scoreProx * 0.4 + scoreMut * 0.4 + scorePop * 0.2;
  let recommendationReason;
  if (mutualCount >= 2) {
    const first = user.mutuals[0];
    recommendationReason = {
      type: 'MUTUAL_FRIENDS',
      text: `Followed by ${first.username} and ${mutualCount - 1} other${mutualCount > 2 ? 's' : ''}`,
      mutualFriends: [user.mutuals[0], user.mutuals[1]],
      totalMutualCount: mutualCount,
    };
  } else if (mutualCount === 1) {
    const first = user.mutuals[0];
    recommendationReason = {
      type: 'MUTUAL_FRIENDS',
      text: `Followed by ${first.username}`,
      mutualFriends: [first],
      totalMutualCount: 1,
    };
  } else if (proxReasonText) {
    recommendationReason = {
      type: proxReasonText.startsWith('From your city') ? 'SAME_CITY' : 'NEARBY',
      text: proxReasonText,
    };
  } else {
    recommendationReason = { type: 'POPULAR', text: 'Suggested for you' };
  }
  return { user, finalScore, recommendationReason };
}

// Fixtures: 80 production-shaped candidates (deterministic PRNG).
function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPool() {
  const rnd = mulberry(42);
  const pool = [];
  for (let i = 0; i < 80; i++) {
    const mutualCount = Math.floor(rnd() * rnd() * 8);
    const mutuals = [];
    for (let m = 0; m < Math.min(mutualCount, 3); m++) {
      mutuals.push({ id: `m-${i}-${m}`, username: `friend${m}`, avatar: null });
    }
    pool.push({
      user: {
        id: `u-${i}`,
        mutuals,
        followersCount: Math.floor(Math.pow(rnd(), 3) * 20000),
        allowNearby: rnd() > 0.2,
      },
      distKm: rnd() > 0.4 ? rnd() * 150 : null,
      city: rnd() > 0.5 ? 'Kyiv' : null,
    });
  }
  return pool;
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
  console.log(' feed-score bench: LEGACY (inline loop) vs NEW (portable core)');
  console.log(` node ${process.version} ${process.platform}-${process.arch}`);
  console.log('===============================================================\n');

  const pool = buildPool();
  const coreInput = pool.map((c) => ({
    id: c.user.id,
    distKm: c.distKm,
    allowNearby: c.user.allowNearby,
    city: c.city,
    mutuals: c.user.mutuals,
    mutualCount: c.user.mutuals.length,
    followersCount: c.user.followersCount,
    lastActiveAtMs: null,
  }));
  const rnd2 = mulberry(7);
  const coreInput2 = coreInput.map((c) => ({
    ...c,
    lastActiveAtMs: Date.now() - Math.floor(rnd2() * 30 * 86400 * 1000),
    interests: [rnd2(), rnd2(), rnd2()],
  }));
  const fullOpts = {
    weights: { proximity: 0.35, mutual: 0.35, popularity: 0.15, recency: 0.1, affinity: 0.05 },
    viewerInterests: [0.2, 0.8, 0.1],
  };

  // Contract gate: identical order + reasons on the pool.
  const legacyRanked = pool
    .map((c) => legacyScore(c.user, c.distKm, c.city))
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((c) => c.user.id);
  const coreRanked = core.rankCandidates(coreInput).map((c) => c.id);
  if (JSON.stringify(legacyRanked) !== JSON.stringify(coreRanked)) {
    throw new Error('ranking order mismatch legacy vs core');
  }
  const legacyReasons = pool.map((c) =>
    JSON.stringify(legacyScore(c.user, c.distKm, c.city).recommendationReason),
  );
  const coreReasons = core.rankCandidates(coreInput).map((c) => JSON.stringify(c.reason));
  const byIdLegacy = {};
  pool.forEach((c, i) => {
    byIdLegacy[c.user.id] = legacyReasons[i];
  });
  for (const c of core.rankCandidates(coreInput)) {
    if (byIdLegacy[c.id] !== JSON.stringify(c.reason))
      throw new Error(`reason mismatch for ${c.id}`);
  }
  console.log('contracts: OK — identical order and reasons on 80-candidate pool\n');

  const rows = [];
  const W = 2000;
  const N = 20000;
  rows.push({
    case: 'rank/80',
    op: 'score+sort',
    legacy: measure(
      () => {
        pool
          .map((c) => legacyScore(c.user, c.distKm, c.city))
          .sort((a, b) => b.finalScore - a.finalScore);
      },
      N,
      W,
    ),
    next: measure(() => core.rankCandidates(coreInput), N, W),
  });
  rows.push({
    case: 'rank/80+decay',
    op: 'score+sort',
    legacy: measure(
      () => {
        pool
          .map((c) => legacyScore(c.user, c.distKm, c.city))
          .sort((a, b) => b.finalScore - a.finalScore);
      },
      N,
      W,
    ),
    next: measure(() => core.rankCandidates(coreInput2, fullOpts), N, W),
  });

  console.log('------------------ RESULTS (mean | p99 | speedup) ------------------');
  for (const r of rows) {
    const speed = r.legacy.meanNs / r.next.meanNs;
    console.log(
      `${r.case.padEnd(14)} ${r.op.padEnd(10)} ` +
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
