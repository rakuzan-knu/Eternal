/**
 * blinded-crypto v1 conformance suite (node:test, zero runtime dependencies).
 *
 *  - Golden vectors (vectors/v1.json): byte-exact signatures, verify
 *    booleans, typed errors — the same file enforced by cargo test.
 *  - Algorithm cross-check: windowed modPow === binary reference on fuzz.
 *  - Hex/edge validation.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {
  bigIntToHex,
  BlindedCryptoError,
  hexToBigInt,
  modPow,
  modPowBinary,
  signBlinded,
  verifyTicket,
} = require('../dist/index.js');

describe('golden vectors (vectors/v1.json — shared cross-language contract)', () => {
  const doc = require('../vectors/v1.json');
  assert.equal(doc.version, 1);
  for (const v of doc.vectors) {
    if (v.expectError) {
      it(`${v.name} throws ${v.expectError}`, () => {
        assert.throws(
          () => signBlinded({ nHex: v.n, dHex: v.d, blindedHex: v.message }),
          (err) => {
            return err instanceof BlindedCryptoError && err.code === v.expectError;
          },
        );
      });
      continue;
    }
    if (!v.verifyOnly) {
      it(`${v.name} signs byte-exact`, () => {
        assert.equal(signBlinded({ nHex: v.n, dHex: v.d, blindedHex: v.message }), v.expectedSig);
      });
    }
    it(`${v.name} verifies as ${v.valid}`, () => {
      assert.equal(
        verifyTicket({ nHex: v.n, eHex: v.e, ticketHex: v.message, signatureHex: v.expectedSig }),
        v.valid,
      );
    });
  }
});

describe('windowed modPow === binary reference (fuzz)', () => {
  it('200 random cases agree exactly', () => {
    for (let i = 0; i < 200; i++) {
      const bits = 64 + Math.floor(Math.random() * 448);
      const n = randomOdd(bits);
      const e = randomBig(bits);
      const m = randomBig(bits) % n;
      assert.equal(modPow(m, e, n).toString(16), modPowBinary(m, e, n).toString(16));
    }
  });

  it('roundtrip sign/verify on fresh 512-bit keys', () => {
    for (let i = 0; i < 3; i++) {
      const { n, e, d } = freshKey(512);
      const m = randomBig(256);
      const sig = signBlinded({ nHex: n, dHex: d, blindedHex: bigIntToHex(m % BigInt(`0x${n}`)) });
      assert.equal(
        verifyTicket({
          nHex: n,
          eHex: e,
          ticketHex: bigIntToHex(m % BigInt(`0x${n}`)),
          signatureHex: sig,
        }),
        true,
      );
    }
  });
});

describe('validation', () => {
  it('rejects garbage hex and ranges', () => {
    assert.throws(() => hexToBigInt('', 'n'), /EMPTY_INPUT/);
    assert.throws(() => hexToBigInt('zz', 'n'), /INVALID_MESSAGE/);
    assert.throws(
      () => signBlinded({ nHex: '01', dHex: '01', blindedHex: '00' }),
      /INVALID_MODULUS/,
    );
    assert.throws(
      () => signBlinded({ nHex: '0ca1', dHex: '0ac1', blindedHex: '0ca1' }),
      /INVALID_MESSAGE/,
    );
    assert.equal(
      verifyTicket({ nHex: '0ca1', eHex: '11', ticketHex: '41', signatureHex: 'zz' }),
      false,
    );
  });

  it('canonical hex form', () => {
    assert.equal(bigIntToHex(0n), '00');
    assert.equal(bigIntToHex(255n), 'ff');
    assert.equal(bigIntToHex(10n), '0a');
  });
});

function randomBig(bits) {
  const bytes = Math.ceil(bits / 8);
  return BigInt(`0x${crypto.randomBytes(bytes).toString('hex') || '00'}`);
}

function randomOdd(bits) {
  return (randomBig(bits) | 1n) + 2n;
}

function freshKey(bits) {
  const { generateKeyPairSync } = require('node:crypto');
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: bits,
    publicExponent: 0x10001,
  });
  const jwk = privateKey.export({ format: 'jwk' });
  const b64u = (s) => Buffer.from(s, 'base64').toString('hex');
  return { n: b64u(jwk.n), e: b64u(jwk.e), d: b64u(jwk.d) };
}
