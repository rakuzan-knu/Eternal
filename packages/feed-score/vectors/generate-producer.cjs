/**
 * Generates packages/feed-score/vectors/producer.v1.json — conformance for
 * topVocabulary + buildInterestVector (TS core, Rust crate).
 *
 * Run: node vectors/generate-producer.cjs (from packages/feed-score)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { buildInterestVector, topVocabulary } = require('../dist/index.js');

const round6 = (xs) => xs.map((x) => Math.round(x * 1e6) / 1e6);

const doc = {
  version: 1,
  note: 'Producer vectors. Floats rounded to 1e-6 (compare with 1e-6 tolerance).',
  vocabulary: [
    {
      name: 'top-dim-ties',
      counts: { '#b': 5, '#a': 5, '#c': 2, '#dup': 3, '#DUP': 3 },
      dim: 3,
      expected: topVocabulary({ '#b': 5, '#a': 5, '#c': 2, '#dup': 3, '#DUP': 3 }, 3),
    },
  ],
  vectors: [
    {
      name: 'counts-normalized',
      contents: ['I love #a and #b #a', 'nothing here', '#b #c #a'],
      vocabulary: ['a', 'b', 'c', 'zzz'],
      expected: round6(
        buildInterestVector(
          ['I love #a and #b #a', 'nothing here', '#b #c #a'],
          ['a', 'b', 'c', 'zzz'],
        ),
      ),
    },
    {
      name: 'empty-no-match',
      contents: ['no tags at all'],
      vocabulary: ['a', 'b'],
      expected: [0, 0],
    },
    {
      name: 'case-insensitive',
      contents: ['#TypeScript #TYPESCRIPT'],
      vocabulary: ['typescript'],
      expected: [1],
    },
  ],
};

const outPath = path.join(__dirname, 'producer.v1.json');
fs.writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${outPath}`);
