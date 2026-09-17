/**
 * Generates packages/msg-codec/vectors/v1.json — the shared conformance
 * contract for EVERY msg-codec implementation (TS core, Rust crate, and any
 * future Swift/Kotlin/RN port).
 *
 * The generator runs on the audited TS core, but the JSON is the authority:
 * any implementation in any language must reproduce expectedHex byte-for-byte
 * and decode it back to the same fields. Committed to git; CI enforces it on
 * both node:test and cargo test sides.
 *
 * Run: node vectors/generate.cjs (from packages/msg-codec)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { encodeAlloc } = require('../dist/index.js');

const UUID_A = '123e4567-e89b-12d3-a456-426614174000';
const UUID_B = '550e8400-e29b-41d4-a716-446655440000';
const UUID_ZERO = '00000000-0000-0000-0000-000000000000';
const UUID_MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const pattern = (len, seed) => {
  const out = new Uint8Array(len);
  let s = seed >>> 0;
  for (let i = 0; i < len; i++) {
    s = (s * 1664525 + 1013904223) >>> 0; // deterministic LCG, no Math.random
    out[i] = (s >>> 8) & 0xff;
  }
  return Buffer.from(out).toString('hex');
};

const CASES = [
  { name: 'empty-min', type: 0, seq: 0, timestampMs: 0, callId: UUID_ZERO, payloadHex: '' },
  { name: 'single-byte', type: 1, seq: 1, timestampMs: 1, callId: UUID_A, payloadHex: 'ff' },
  {
    name: 'voice-frame',
    type: 7,
    seq: 424242,
    timestampMs: 1700000000000,
    callId: UUID_A,
    payloadHex: 'deadbeef',
  },
  {
    name: 'header-sized-payload',
    type: 9,
    seq: 42,
    timestampMs: 7,
    callId: UUID_B,
    payloadHex: pattern(36, 1),
  },
  {
    name: 'voice-256',
    type: 12,
    seq: 1000000,
    timestampMs: 1700000000123,
    callId: UUID_B,
    payloadHex: pattern(256, 7),
  },
  {
    name: 'video-mtu-1200',
    type: 300,
    seq: 2147483647,
    timestampMs: 1234567890123,
    callId: UUID_A,
    payloadHex: pattern(1200, 99),
  },
  {
    name: 'max-values',
    type: 65535,
    seq: 4294967295,
    timestampMs: 9007199254740991,
    callId: UUID_MAX,
    payloadHex: '00ff01',
  },
];

const vectors = CASES.map((c) => {
  const payload = Buffer.from(c.payloadHex, 'hex');
  const expectedHex = Buffer.from(
    encodeAlloc({
      type: c.type,
      seq: c.seq,
      timestampMs: c.timestampMs,
      callId: c.callId,
      payload,
    }),
  ).toString('hex');
  return { ...c, expectedHex };
});

const doc = {
  version: 1,
  note: 'Shared msg-codec v1 conformance contract. expectedHex must match byte-for-byte.',
  vectors,
};

const outPath = path.join(__dirname, 'v1.json');
fs.writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${outPath} (${vectors.length} vectors)`);
