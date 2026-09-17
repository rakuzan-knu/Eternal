/**
 * @social-network/native adapter tests (node:test, zero dependencies).
 *
 * Wire conformance lives in @social-network/msg-codec. Here we verify the
 * Node layer only: backend selection, Buffer-typed surface, metrics, and
 * fail-fast behavior of MSG_CODEC=native without a binary.
 */
'use strict';

process.env.MSG_CODEC = 'ts';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  __resetActiveCodecForTests,
  decodePacket,
  encodeAlloc,
  getActiveCodec,
  getCodecInfo,
  getCodecMetrics,
  MsgCodecError,
  parseSelection,
  resetCodecMetrics,
  tryLoadBlindedCrypto,
  tryLoadNative,
  tryLoadTextPipeline,
} = require('../dist/index.js');

const UUID_A = '123e4567-e89b-12d3-a456-426614174000';

beforeEach(() => {
  process.env.MSG_CODEC = 'ts';
  __resetActiveCodecForTests();
});

afterEach(() => {
  process.env.MSG_CODEC = 'ts';
  __resetActiveCodecForTests();
});

describe('node adapter surface', () => {
  it('roundtrips with Buffer in/out', () => {
    const codec = getActiveCodec();
    assert.equal(codec.backend, 'ts');
    const out = codec.encodeAlloc({
      type: 7,
      seq: 424242,
      timestampMs: 1700000000000,
      callId: UUID_A,
      payload: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
    });
    assert.ok(Buffer.isBuffer(out));
    const back = codec.decodePacket(out);
    assert.ok(Buffer.isBuffer(back.payload));
    assert.equal(back.callId, UUID_A);
    assert.equal(back.timestampMs, 1700000000000);
  });

  it('top-level helpers stay Buffer-typed', () => {
    const out = encodeAlloc({
      type: 1,
      seq: 1,
      timestampMs: 1,
      callId: UUID_A,
      payload: Buffer.alloc(0),
    });
    assert.ok(Buffer.isBuffer(out));
    assert.equal(decodePacket(out).payloadLength, 0);
  });

  it('reports ts backend without a native binary', () => {
    const info = getCodecInfo();
    assert.equal(info.name, '@social-network/native');
    assert.equal(info.backend, 'ts');
    assert.equal(info.nativeLoaded, false);
    assert.equal(info.protocolVersion, 1);
  });

  it('counts calls and errors', () => {
    resetCodecMetrics();
    const codec = getActiveCodec();
    codec.encodeAlloc({
      type: 1,
      seq: 1,
      timestampMs: 1,
      callId: UUID_A,
      payload: Buffer.from([9]),
    });
    codec.decodeHeader(
      codec.encodeAlloc({
        type: 1,
        seq: 1,
        timestampMs: 1,
        callId: UUID_A,
        payload: Buffer.alloc(0),
      }),
    );
    assert.throws(() => codec.decodePacket(Buffer.alloc(10)), MsgCodecError);
    const snap = getCodecMetrics();
    assert.equal(snap.encodeCalls, 2);
    assert.equal(snap.headerOnlyCalls, 1);
    assert.equal(snap.errors.TRUNCATED, 1);
  });
});

describe('backend selection', () => {
  it('parses MSG_CODEC with safe default', () => {
    assert.equal(parseSelection('ts'), 'ts');
    assert.equal(parseSelection('native'), 'native');
    assert.equal(parseSelection('auto'), 'auto');
    assert.equal(parseSelection('garbage'), 'auto');
  });

  it('tryLoadNative returns null in ts mode and never throws', () => {
    process.env.MSG_CODEC = 'ts';
    assert.equal(tryLoadNative(), null);
    process.env.MSG_CODEC = 'auto';
    assert.equal(tryLoadNative(), null); // no prebuilds published yet
  });

  it('MSG_CODEC=native fails fast without a verified binary', () => {
    process.env.MSG_CODEC = 'native';
    __resetActiveCodecForTests();
    assert.throws(
      () => getActiveCodec(),
      (err) => err instanceof MsgCodecError && err.code === 'NATIVE_SELFTEST_FAILED',
    );
  });
});

describe('accelerator host (text-pipeline, blinded-crypto)', () => {
  const OLD_TEXT = process.env.MSG_TEXT;
  const OLD_BLIND = process.env.MSG_BLIND;

  afterEach(() => {
    if (OLD_TEXT === undefined) delete process.env.MSG_TEXT;
    else process.env.MSG_TEXT = OLD_TEXT;
    if (OLD_BLIND === undefined) delete process.env.MSG_BLIND;
    else process.env.MSG_BLIND = OLD_BLIND;
  });

  it('returns null in ts mode and auto without prebuilds, never throws', () => {
    process.env.MSG_TEXT = 'ts';
    process.env.MSG_BLIND = 'ts';
    assert.equal(tryLoadTextPipeline(), null);
    assert.equal(tryLoadBlindedCrypto(), null);
    process.env.MSG_TEXT = 'auto';
    process.env.MSG_BLIND = 'auto';
    assert.equal(tryLoadTextPipeline(), null);
    assert.equal(tryLoadBlindedCrypto(), null);
  });

  it('MSG_TEXT/MSG_BLIND=native fail fast without a verified binary', () => {
    process.env.MSG_TEXT = 'native';
    assert.throws(() => tryLoadTextPipeline(), /MSG_TEXT=native/);
    process.env.MSG_TEXT = 'ts';
    process.env.MSG_BLIND = 'native';
    assert.throws(() => tryLoadBlindedCrypto(), /MSG_BLIND=native/);
  });
});
