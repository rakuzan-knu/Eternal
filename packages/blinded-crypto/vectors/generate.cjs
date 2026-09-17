/**
 * Generates packages/blinded-crypto/vectors/v1.json — the shared conformance
 * contract for EVERY blinded-crypto implementation (TS core, Rust crate).
 *
 * Keys are FIXED test constants (never production keys):
 *  - tiny: textbook RSA p=61,q=53,n=3233,e=17,d=2753 (instant, edge-friendly).
 *  - rsa512: fixed 512-bit test key (throwaway, generated once via Node
 *    crypto solely to obtain a well-formed (n,e,d) triple; roundtrip-verified
 *    below before writing).
 * modpow is deterministic, so expectedSig values are stable across languages.
 *
 * Run: node vectors/generate.cjs (from packages/blinded-crypto)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { bigIntToHex, modPowBinary, signBlinded, verifyTicket } = require('../dist/index.js');

const TINY = { n: '0ca1', e: '11', d: '0ac1' }; // n=3233, e=17, d=2753
const RSA512 = {
  n: 'cc333d31df48ce8a13be7408bb8c1631eceb187f0daabcbf7ca9084fcee30e784e19a86146803292d6f37b41bc603949ff115d7e1b3ba45345ed9c34da0348eb',
  e: '010001',
  d: '13a05d225cfea773580077309bae14380a38726b4bc9fc483f5813c76ff01ce4c13f67e808beb476fe523a24b31e2f9fe238cfb0ca4ff45ddfa5de758130d591',
};

const MSG512 =
  '9f2c4a7e1b5d83f06a4c9e2b7d5f1a3c8e6b4d2f0a9c7e5b3d1f6a8c4e2b0d9f3a5c7e1b4d6f8a0c2e4b6d8f0a1c3e5b7d9f1a3c5e7b';

const vectors = [];

function addSignVerify(name, key, messageHex) {
  const n = BigInt(`0x${key.n}`);
  const expectedSig = bigIntToHex(modPowBinary(BigInt(`0x${messageHex}`), BigInt(`0x${key.d}`), n));
  const sig = signBlinded({ nHex: key.n, dHex: key.d, blindedHex: messageHex });
  if (sig !== expectedSig) throw new Error(`generator self-check failed on ${name}`);
  const valid = verifyTicket({
    nHex: key.n,
    eHex: key.e,
    ticketHex: messageHex,
    signatureHex: sig,
  });
  if (!valid) throw new Error(`generator roundtrip failed on ${name}`);
  vectors.push({
    name,
    n: key.n,
    e: key.e,
    d: key.d,
    message: messageHex,
    expectedSig: sig,
    valid: true,
  });
}

addSignVerify('tiny-sign', TINY, '41');
addSignVerify('tiny-edge-zero', TINY, '00');
addSignVerify('tiny-edge-one', TINY, '01');
addSignVerify('tiny-edge-n-minus-1', TINY, '0ca0');
addSignVerify('rsa512-sign', RSA512, MSG512);

// Tampered signature must NOT verify (same ticket, flipped low bit).
{
  const base = vectors.find((v) => v.name === 'tiny-sign');
  const tampered = bigIntToHex(BigInt(`0x${base.expectedSig}`) ^ 1n);
  const valid = verifyTicket({
    nHex: TINY.n,
    eHex: TINY.e,
    ticketHex: base.message,
    signatureHex: tampered,
  });
  if (valid) throw new Error('generator self-check: tampered signature verified');
  vectors.push({
    name: 'tiny-verify-tampered',
    n: TINY.n,
    e: TINY.e,
    message: base.message,
    expectedSig: tampered,
    valid: false,
    verifyOnly: true,
  });
}

// Out-of-range message must throw INVALID_MESSAGE (asserted by tests, not by value).
vectors.push({
  name: 'tiny-sign-out-of-range',
  n: TINY.n,
  e: TINY.e,
  d: TINY.d,
  message: TINY.n,
  expectError: 'INVALID_MESSAGE',
});

const doc = {
  version: 1,
  note: 'Shared blinded-crypto v1 conformance contract. expectedSig must match byte-for-byte.',
  vectors,
};

const outPath = path.join(__dirname, 'v1.json');
fs.writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${outPath} (${vectors.length} vectors)`);
