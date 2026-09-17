/**
 * Generates packages/feed-score/vectors/v1.json — the shared conformance
 * contract for EVERY feed-score implementation (TS core, Rust crate).
 *
 * Scores are rounded to 6 decimals; cross-language tests compare floats with
 * 1e-9 tolerance (libm last-ULP), reasons and ORDER exactly.
 *
 * Run: node vectors/generate.cjs (from packages/feed-score)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { rankCandidates } = require('../dist/index.js');

const NOW = 1725800000000;
const DAY = 86_400_000;

function mut(id, username) {
  return { id, username, avatar: null };
}

const CASES = [
  {
    name: 'legacy-mixed-pool',
    options: {},
    candidates: [
      {
        id: 'u-geo',
        distKm: 5,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 99,
        lastActiveAtMs: null,
      },
      {
        id: 'u-social',
        distKm: null,
        allowNearby: true,
        city: null,
        mutuals: [mut('m1', 'anna'), mut('m2', 'bob'), mut('m3', 'cid')],
        mutualCount: 3,
        followersCount: 9,
        lastActiveAtMs: null,
      },
      {
        id: 'u-pop',
        distKm: 500,
        allowNearby: true,
        city: 'Lviv',
        mutuals: [],
        mutualCount: 0,
        followersCount: 9999,
        lastActiveAtMs: null,
      },
      {
        id: 'u-zero',
        distKm: null,
        allowNearby: false,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 0,
        lastActiveAtMs: null,
      },
    ],
  },
  {
    name: 'reason-cards',
    options: {},
    candidates: [
      {
        id: 'u-one-mutual',
        distKm: 3,
        allowNearby: true,
        city: null,
        mutuals: [mut('m1', 'anna')],
        mutualCount: 1,
        followersCount: 0,
        lastActiveAtMs: null,
      },
      {
        id: 'u-city',
        distKm: 40,
        allowNearby: true,
        city: 'Kyiv',
        mutuals: [],
        mutualCount: 0,
        followersCount: 3,
        lastActiveAtMs: null,
      },
      {
        id: 'u-near-non-city',
        distKm: 40,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 3,
        lastActiveAtMs: null,
      },
    ],
  },
  {
    name: 'tie-stability',
    options: {},
    candidates: ['c', 'a', 'b'].map((id) => ({
      id: `u-${id}`,
      distKm: null,
      allowNearby: true,
      city: null,
      mutuals: [],
      mutualCount: 0,
      followersCount: 0,
      lastActiveAtMs: null,
    })),
  },
  {
    name: 'recency-decay',
    options: {
      weights: { proximity: 0, mutual: 0, popularity: 0, recency: 1, affinity: 0 },
      nowMs: NOW,
      recencyHalfLifeHours: 24,
    },
    candidates: [
      {
        id: 'u-fresh',
        distKm: null,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 0,
        lastActiveAtMs: NOW - DAY,
      },
      {
        id: 'u-old',
        distKm: null,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 0,
        lastActiveAtMs: NOW - 10 * DAY,
      },
      {
        id: 'u-unknown',
        distKm: null,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 0,
        lastActiveAtMs: null,
      },
    ],
  },
  {
    name: 'affinity-cosine',
    options: {
      weights: { proximity: 0, mutual: 0, popularity: 0, recency: 0, affinity: 1 },
      viewerInterests: [1, 0, 1, 0],
    },
    candidates: [
      {
        id: 'u-aligned',
        distKm: null,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 0,
        lastActiveAtMs: null,
        interests: [1, 0, 1, 0],
      },
      {
        id: 'u-ortho',
        distKm: null,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 0,
        lastActiveAtMs: null,
        interests: [0, 1, 0, 1],
      },
      {
        id: 'u-zero-vec',
        distKm: null,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 0,
        lastActiveAtMs: null,
        interests: [0, 0, 0, 0],
      },
      {
        id: 'u-dim-mismatch',
        distKm: null,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 0,
        lastActiveAtMs: null,
        interests: [1, 0],
      },
    ],
  },
  {
    name: 'empty-pool',
    options: {},
    candidates: [],
  },
];

const vectors = CASES.map((c) => ({
  name: c.name,
  options: c.options,
  candidates: c.candidates,
  expected: rankCandidates(c.candidates, { ...c.options, nowMs: c.options.nowMs ?? NOW }),
}));

const doc = {
  version: 1,
  note: 'Shared feed-score v1 contract. Scores rounded to 1e-6; compare floats with 1e-9 tolerance, order/reasons exactly.',
  vectors,
};

const outPath = path.join(__dirname, 'v1.json');
fs.writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${outPath} (${vectors.length} cases)`);
