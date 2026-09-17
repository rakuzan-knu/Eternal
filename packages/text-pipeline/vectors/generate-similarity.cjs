/**
 * Generates packages/text-pipeline/vectors/similarity.v1.json — shared
 * conformance for levenshtein / trigram-Dice / rankFuzzy (TS core, Rust).
 *
 * Run: node vectors/generate-similarity.cjs (from packages/text-pipeline)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { levenshtein, rankFuzzy, trigramDice, trigramProfile } = require('../dist/index.js');

const doc = {
  version: 1,
  note: 'Shared similarity v1 contract. Distances exact; dice rounded to 1e-6 (compare with 1e-6 tolerance).',
  levenshtein: [
    { a: 'kitten', b: 'sitting', maxDist: 10, expected: 3 },
    { a: 'saturday', b: 'sunday', maxDist: 10, expected: 3 },
    { a: 'abc', b: 'abc', maxDist: 2, expected: 0 },
    { a: '', b: 'abc', maxDist: 5, expected: 3 },
    { a: 'abc', b: '', maxDist: 5, expected: 3 },
    { a: 'alex', b: 'alexx', maxDist: 2, expected: 1 },
    { a: 'abcdef', b: 'XbcYef', maxDist: 2, expected: 2 },
    { a: 'abcdef', b: 'XbcYef', maxDist: 1, expected: 2 },
    { a: 'short', b: 'a completely different string', maxDist: 2, expected: 3 },
    { a: 'привет', b: 'привед', maxDist: 2, expected: 1 },
    { a: null, b: 'x', maxDist: 2, expected: 1 },
  ].map((c) => ({ ...c, got: levenshtein(c.a, c.b, c.maxDist) })),
  dice: [
    { a: 'alex', b: 'alex' },
    { a: 'alex', b: 'aleks' },
    { a: 'abcdef', b: 'XbcYef' },
    { a: '', b: 'x' },
  ].map((c) => ({
    ...c,
    expected: Math.round(trigramDice(trigramProfile(c.a), trigramProfile(c.b)) * 1e6) / 1e6,
  })),
  rankFuzzy: [
    {
      term: 'aleks',
      candidates: ['alex', 'aleksandr', 'bob', 'alexey', 'x'],
      options: { maxDist: 2, limit: 3 },
      expected: rankFuzzy('aleks', ['alex', 'aleksandr', 'bob', 'alexey', 'x'], {
        maxDist: 2,
        limit: 3,
      }),
    },
  ],
};

// Self-check: generator asserts what tests will assert.
for (const c of doc.levenshtein) {
  if (c.got !== c.expected) throw new Error(`levenshtein drift: ${c.a} vs ${c.b}`);
}

const outPath = path.join(__dirname, 'similarity.v1.json');
fs.writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${outPath}`);
