/**
 * feed-score v1 conformance suite (node:test, zero runtime dependencies).
 *
 *  - Golden vectors (vectors/v1.json): exact order/reasons, float parts and
 *    scores with 1e-9 tolerance (libm last-ULP across languages).
 *  - Hand-computed legacy parity: the v1 default preset reproduces the
 *    backend composite bit-for-bit on textbook inputs.
 *  - Option validation and edge behavior.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildInterestVector,
  LEGACY_WEIGHTS,
  normalizeTag,
  rankCandidates,
  scoreAffinity,
  scoreMutual,
  scorePopularity,
  scoreProximity,
  scoreRecency,
  topVocabulary,
} = require('../dist/index.js');

const TOL = 1e-9;
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < TOL, `${msg}: ${a} vs ${b}`);

describe('golden vectors (vectors/v1.json — shared cross-language contract)', () => {
  const doc = require('../vectors/v1.json');
  assert.equal(doc.version, 1);
  for (const v of doc.vectors) {
    it(v.name, () => {
      const got = rankCandidates(v.candidates, v.options);
      assert.equal(got.length, v.expected.length);
      for (let i = 0; i < got.length; i++) {
        const g = got[i];
        const e = v.expected[i];
        assert.equal(g.id, e.id, `${v.name}[${i}].id`);
        close(g.score, e.score, `${v.name}[${i}].score`);
        for (const k of ['proximity', 'mutual', 'popularity', 'recency', 'affinity']) {
          close(g.parts[k], e.parts[k], `${v.name}[${i}].parts.${k}`);
        }
        assert.deepEqual(g.reason, e.reason);
      }
    });
  }
});

describe('legacy parity (hand-computed)', () => {
  it('composite 0.4/0.4/0.2 on textbook inputs', () => {
    const [r] = rankCandidates([
      {
        id: 'u',
        distKm: 10,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 3,
        followersCount: 99,
        lastActiveAtMs: null,
      },
    ]);
    // prox 0.9, mut 0.6, pop 0.5 -> 0.36 + 0.24 + 0.10 = 0.70
    close(r.parts.proximity, 0.9, 'prox');
    close(r.parts.mutual, 0.6, 'mut');
    close(r.parts.popularity, 0.5, 'pop');
    close(r.score, 0.7, 'final');
  });

  it('zero-input candidate scores exactly 0 with POPULAR reason', () => {
    const [r] = rankCandidates([
      {
        id: 'u',
        distKm: null,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 0,
        followersCount: 0,
        lastActiveAtMs: null,
      },
    ]);
    assert.equal(r.score, 0);
    assert.deepEqual(r.reason, { type: 'POPULAR', text: 'Suggested for you' });
  });

  it('unit functions match legacy formulas', () => {
    close(scoreProximity(5, true, 100), 0.95, 'prox');
    assert.equal(scoreProximity(500, true, 100), 0);
    assert.equal(scoreProximity(5, false, 100), 0);
    close(scoreMutual(3, 5), 0.6, 'mut');
    assert.equal(scoreMutual(9, 5), 1);
    close(scorePopularity(99, 4), 0.5, 'pop');
    assert.equal(scorePopularity(999999, 4), 1);
  });

  it('recency halves every half-life, unknown is 0', () => {
    const now = 1_000_000_000_000;
    close(scoreRecency(now - 3_600_000, now, 1), 0.5, 'one half-life');
    assert.equal(scoreRecency(null, now, 1), 0);
    close(scoreRecency(now + 999, now, 1), 1, 'future clamps to fresh');
  });

  it('cosine is exact on textbook vectors', () => {
    assert.equal(scoreAffinity([1, 0], [1, 0]), 1);
    assert.equal(scoreAffinity([1, 0], [0, 1]), 0);
    assert.equal(scoreAffinity([1, 0], [0, 0]), 0);
    assert.equal(scoreAffinity([1, 0], [1]), 0);
    assert.equal(scoreAffinity([], []), 0);
    close(scoreAffinity([1, 1], [1, 0]), Math.SQRT1_2, 'diag');
  });
});

describe('options and edges', () => {
  it('rejects weights that do not sum to 1 or go negative', () => {
    assert.throws(
      () => rankCandidates([], { weights: { ...LEGACY_WEIGHTS, mutual: 0.5 } }),
      /sum to 1/,
    );
    assert.throws(
      () =>
        rankCandidates([], {
          weights: { proximity: 2, mutual: 0, popularity: 0, recency: 0, affinity: -1 },
        }),
      /sum to 1|>= 0/,
    );
  });

  it('empty pool ranks to empty', () => {
    assert.deepEqual(rankCandidates([]), []);
  });

  it('custom radius and divisors apply', () => {
    const [r] = rankCandidates(
      [
        {
          id: 'u',
          distKm: 50,
          allowNearby: true,
          city: null,
          mutuals: [],
          mutualCount: 10,
          followersCount: 0,
          lastActiveAtMs: null,
        },
      ],
      { radiusKm: 200, mutualDivisor: 10 },
    );
    close(r.parts.proximity, 0.75, 'radius');
    assert.equal(r.parts.mutual, 1);
  });
});

describe('producer golden vectors (vectors/producer.v1.json)', () => {
  const doc = require('../vectors/producer.v1.json');
  assert.equal(doc.version, 1);
  for (const v of doc.vocabulary) {
    it(`vocab ${v.name}`, () => {
      assert.deepEqual(topVocabulary(v.counts, v.dim), v.expected);
    });
  }
  for (const v of doc.vectors) {
    it(`vector ${v.name}`, () => {
      const got = buildInterestVector(v.contents, v.vocabulary);
      assert.equal(got.length, v.expected.length);
      for (let i = 0; i < got.length; i++) {
        // Stored rounded to 1e-6 — tolerance must cover rounding.
        assert.ok(Math.abs(got[i] - v.expected[i]) < 1e-6, `${v.name}[${i}]`);
      }
    });
  }
});

describe('producer units', () => {
  it('normalizes tags and merges case variants', () => {
    assert.equal(normalizeTag('#TypeScript'), 'typescript');
    assert.deepEqual(topVocabulary({ '#A': 1, '#a': 2 }, 5), ['a']);
  });

  it('empty vocabulary yields zero vector', () => {
    assert.deepEqual(buildInterestVector(['#a'], []), []);
    assert.deepEqual(buildInterestVector(['plain'], ['a']), [0]);
  });
});
