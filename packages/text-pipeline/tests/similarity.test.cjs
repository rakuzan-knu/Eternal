/**
 * similarity v1 conformance suite (node:test, zero runtime dependencies).
 *
 * Golden vectors (vectors/similarity.v1.json) + the documented
 * no-gate invariant: trigram Dice NEVER drops true matches — rankFuzzy
 * verifies every survivor with bounded Levenshtein.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { levenshtein, rankFuzzy, trigramDice, trigramProfile } = require('../dist/index.js');

const TOL = 1e-9;

describe('golden vectors (vectors/similarity.v1.json)', () => {
  const doc = require('../vectors/similarity.v1.json');
  assert.equal(doc.version, 1);

  it('levenshtein exact within cap, capped beyond', () => {
    for (const c of doc.levenshtein) {
      assert.equal(levenshtein(c.a, c.b, c.maxDist), c.expected, `${c.a} vs ${c.b}`);
    }
  });

  it('trigram dice', () => {
    for (const c of doc.dice) {
      const got = trigramDice(trigramProfile(c.a), trigramProfile(c.b));
      // Vectors store dice rounded to 1e-6 — tolerance must cover rounding.
      assert.ok(Math.abs(got - c.expected) < 1e-6, `${c.a} vs ${c.b}: ${got} vs ${c.expected}`);
    }
  });

  it('rankFuzzy ordering and cutoff', () => {
    for (const c of doc.rankFuzzy) {
      assert.deepEqual(rankFuzzy(c.term, c.candidates, c.options), c.expected);
    }
  });
});

describe('no-gate invariant (documented counterexample)', () => {
  it('keeps "XbcYef" for "abcdef" despite dice 0.14 (dist 2, verifiable)', () => {
    // Dice alone would suggest dropping; the verified distance keeps it.
    const dice = trigramDice(trigramProfile('abcdef'), trigramProfile('XbcYef'));
    assert.ok(dice < 0.2, `precondition: low dice, got ${dice}`);
    const ranked = rankFuzzy('abcdef', ['XbcYef', 'zzzzzz'], { maxDist: 2 });
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].value, 'XbcYef');
    assert.equal(ranked[0].dist, 2);
  });

  it('length gate short-circuits hopeless pairs', () => {
    assert.equal(levenshtein('ab', 'abcdefghij', 2), 3);
  });

  it('bounded callers see identical decisions to full ones', () => {
    // Callers only branch on dist <= 2: capped 3 behaves like any larger value.
    assert.ok(levenshtein('abc', 'xyzxyz', 2) > 2);
    assert.equal(levenshtein('abc', 'abd', 2), 1);
  });
});
