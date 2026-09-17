/**
 * msg-codec v1 conformance suite (node:test, zero dependencies).
 *
 * Runs against ../dist. Portable assertions only: inputs may be Buffer
 * (Buffers ARE Uint8Arrays), but expectations never rely on Node-only
 * methods of the codec output.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {
  decodeHeader,
  decodePacket,
  encodeAlloc,
  encodeInto,
  formatUuid,
  HEADER_SIZE_BYTES,
  MAX_PAYLOAD_BYTES,
  MsgCodecError,
  parseUuidInto,
} = require('../dist/index.js');

const UUID_A = '123e4567-e89b-12d3-a456-426614174000';
const UUID_ZERO = '00000000-0000-0000-0000-000000000000';
const UUID_MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const toHex = (view) => Buffer.from(view.buffer, view.byteOffset, view.byteLength).toString('hex');
const equalBytes = (a, b) =>
  a.byteLength === b.byteLength && Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;

/** Independent naive reader: DataView + manual UUID format. */
function referenceDecode(buf, offset = 0) {
  const view = new DataView(buf.buffer, buf.byteOffset + offset, buf.byteLength - offset);
  const magic0 = view.getUint8(0);
  const magic1 = view.getUint8(1);
  assert.equal(magic0, 0x45);
  assert.equal(magic1, 0x54);
  const type = view.getUint16(2, false);
  const seq = view.getUint32(4, false);
  const ts = Number(view.getBigUint64(8, false));
  const hex = toHex(new Uint8Array(buf.buffer, buf.byteOffset + offset + 16, 16));
  const callId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const payloadLength = view.getUint32(32, false);
  const payload = new Uint8Array(buf.buffer, buf.byteOffset + offset + 36, payloadLength);
  return { type, seq, timestampMs: ts, callId, payloadLength, payload };
}

function expectCode(fn, code) {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof MsgCodecError, `expected MsgCodecError, got ${err}`);
    assert.equal(err.code, code);
    return;
  }
  assert.fail(`expected throw with code ${code}`);
}

describe('msg-codec v1 layout is frozen', () => {
  it('encodes exact bytes at exact offsets', () => {
    const out = encodeAlloc({
      type: 0x0102,
      seq: 0x03040506,
      timestampMs: 0x0708090a0b0c,
      callId: UUID_A,
      payload: new Uint8Array([0x0e, 0x0f]),
    });
    assert.ok(out instanceof Uint8Array);
    assert.equal(out.byteLength, HEADER_SIZE_BYTES + 2);
    assert.equal(out[0], 0x45);
    assert.equal(out[1], 0x54);
    assert.deepEqual(Array.from(out.subarray(2, 4)), [0x01, 0x02]);
    assert.deepEqual(Array.from(out.subarray(4, 8)), [0x03, 0x04, 0x05, 0x06]);
    assert.deepEqual(
      Array.from(out.subarray(8, 16)),
      [0x00, 0x00, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c],
    );
    assert.deepEqual(Array.from(out.subarray(32, 36)), [0x00, 0x00, 0x00, 0x02]);
    assert.deepEqual(Array.from(out.subarray(36)), [0x0e, 0x0f]);
    assert.equal(toHex(out.subarray(16, 32)), UUID_A.replace(/-/g, ''));
  });

  it('matches the independent reference decoder', () => {
    const payload = crypto.randomBytes(300);
    const out = encodeAlloc({
      type: 77,
      seq: 123456,
      timestampMs: 1700000000000,
      callId: UUID_A,
      payload,
    });
    const back = decodePacket(out);
    const ref = referenceDecode(out);
    assert.equal(back.type, ref.type);
    assert.equal(back.seq, ref.seq);
    assert.equal(back.timestampMs, ref.timestampMs);
    assert.equal(back.callId, ref.callId);
    assert.equal(back.payloadLength, ref.payloadLength);
    assert.ok(equalBytes(back.payload, ref.payload));
  });
});

describe('roundtrips', () => {
  const cases = [
    { name: 'empty payload', payload: new Uint8Array(0) },
    { name: '1 byte', payload: new Uint8Array([0x01]) },
    { name: 'voice frame 256B', payload: crypto.randomBytes(256) },
    { name: 'video mtu 1200B', payload: crypto.randomBytes(1200) },
    { name: 'jumbo 64KiB', payload: crypto.randomBytes(65536) },
  ];
  for (const c of cases) {
    it(c.name, () => {
      const out = encodeAlloc({
        type: 9,
        seq: 42,
        timestampMs: Date.now(),
        callId: UUID_A,
        payload: c.payload,
      });
      const back = decodePacket(out);
      assert.equal(back.type, 9);
      assert.equal(back.seq, 42);
      assert.equal(back.callId, UUID_A);
      assert.equal(back.payloadLength, c.payload.byteLength);
      assert.ok(equalBytes(back.payload, c.payload));
    });
  }

  it('raw 16-byte callId equals string callId on the wire', () => {
    const raw = new Uint8Array(Buffer.from(UUID_A.replace(/-/g, ''), 'hex'));
    const a = encodeAlloc({
      type: 1,
      seq: 1,
      timestampMs: 5,
      callId: UUID_A,
      payload: new Uint8Array(0),
    });
    const b = encodeAlloc({
      type: 1,
      seq: 1,
      timestampMs: 5,
      callId: raw,
      payload: new Uint8Array(0),
    });
    assert.ok(equalBytes(a, b));
  });

  it('fuzz: 2000 random packets roundtrip + reference match', () => {
    for (let i = 0; i < 2000; i++) {
      const len = Math.floor(Math.random() * 1500);
      const out = encodeAlloc({
        type: Math.floor(Math.random() * 65536),
        seq: Math.floor(Math.random() * 4294967296),
        timestampMs: Math.floor(Math.random() * Date.now()),
        callId: crypto.randomUUID(),
        payload: crypto.randomBytes(len),
      });
      const back = decodePacket(out);
      const ref = referenceDecode(out);
      assert.equal(back.type, ref.type);
      assert.equal(back.seq, ref.seq);
      assert.equal(back.timestampMs, ref.timestampMs);
      assert.equal(back.callId, ref.callId);
      assert.ok(equalBytes(back.payload, ref.payload));
    }
  });
});

describe('encodeInto slab semantics', () => {
  it('writes at nonzero offsets and packs packets back-to-back', () => {
    const slab = new Uint8Array(4096);
    const payload = new Uint8Array([1, 2, 3, 4]);
    const end1 = encodeInto(slab, 0, {
      type: 1,
      seq: 1,
      timestampMs: 1,
      callId: UUID_ZERO,
      payload,
    });
    const end2 = encodeInto(slab, end1, {
      type: 2,
      seq: 2,
      timestampMs: 2,
      callId: UUID_MAX,
      payload,
    });
    assert.equal(end1, HEADER_SIZE_BYTES + 4);
    assert.equal(end2, 2 * (HEADER_SIZE_BYTES + 4));
    assert.equal(decodePacket(slab, 0).callId, UUID_ZERO);
    assert.equal(decodePacket(slab, end1).callId, UUID_MAX);
    assert.equal(decodeHeader(slab, end1).type, 2);
  });

  it('payload views and ranges', () => {
    const big = crypto.randomBytes(100);
    const out = encodeAlloc({
      type: 3,
      seq: 3,
      timestampMs: 3,
      callId: UUID_A,
      payload: big,
      payloadOffset: 10,
      payloadLength: 20,
    });
    assert.equal(out.byteLength, HEADER_SIZE_BYTES + 20);
    assert.ok(equalBytes(decodePacket(out).payload, big.subarray(10, 30)));
  });
});

describe('error taxonomy', () => {
  it('TRUNCATED on short buffers', () => {
    expectCode(() => decodePacket(new Uint8Array(35)), 'TRUNCATED');
    expectCode(() => decodeHeader(new Uint8Array(0)), 'TRUNCATED');
    const full = encodeAlloc({
      type: 1,
      seq: 1,
      timestampMs: 1,
      callId: UUID_A,
      payload: new Uint8Array(10),
    });
    expectCode(() => decodePacket(full.subarray(0, full.byteLength - 1)), 'TRUNCATED');
  });

  it('INVALID_MAGIC', () => {
    const bad = new Uint8Array(HEADER_SIZE_BYTES);
    bad[0] = 0x00;
    expectCode(() => decodePacket(bad), 'INVALID_MAGIC');
  });

  it('INVALID_UUID variants', () => {
    for (const bad of [
      'short',
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      '123e4567-e89b-12d3-a456-42661417400Z',
      '123e4567_e89b-12d3-a456-426614174000',
      '',
    ]) {
      expectCode(
        () =>
          encodeAlloc({ type: 1, seq: 1, timestampMs: 1, callId: bad, payload: new Uint8Array(0) }),
        'INVALID_UUID',
      );
    }
    expectCode(
      () =>
        encodeAlloc({
          type: 1,
          seq: 1,
          timestampMs: 1,
          callId: new Uint8Array(15),
          payload: new Uint8Array(0),
        }),
      'INVALID_UUID',
    );
  });

  it('range guards', () => {
    const ok = { seq: 1, timestampMs: 1, callId: UUID_A, payload: new Uint8Array(0) };
    expectCode(() => encodeAlloc({ ...ok, type: -1 }), 'INVALID_TYPE');
    expectCode(() => encodeAlloc({ ...ok, type: 65536 }), 'INVALID_TYPE');
    expectCode(() => encodeAlloc({ ...ok, type: 1, seq: -1 }), 'INVALID_SEQ');
    expectCode(() => encodeAlloc({ ...ok, type: 1, seq: 4294967296 }), 'INVALID_SEQ');
    expectCode(() => encodeAlloc({ ...ok, type: 1, timestampMs: -1 }), 'INVALID_TIMESTAMP');
    expectCode(
      () => encodeAlloc({ ...ok, type: 1, timestampMs: Number.MAX_SAFE_INTEGER + 1 }),
      'INVALID_TIMESTAMP',
    );
    expectCode(
      () =>
        encodeAlloc({
          ...ok,
          type: 1,
          payload: new Uint8Array(0),
          payloadLength: MAX_PAYLOAD_BYTES + 1,
        }),
      'PAYLOAD_TOO_LARGE',
    );
    expectCode(() => encodeInto(new Uint8Array(10), 0, { ...ok, type: 1 }), 'BUFFER_TOO_SMALL');
  });

  it('framing mismatch', () => {
    const full = encodeAlloc({
      type: 1,
      seq: 1,
      timestampMs: 1,
      callId: UUID_A,
      payload: new Uint8Array(8),
    });
    expectCode(() => decodePacket(full, 0, full.byteLength - 1), 'TRUNCATED');
    const padded = new Uint8Array(full.byteLength + 4);
    padded.set(full, 0);
    expectCode(() => decodePacket(padded, 0, padded.byteLength), 'PAYLOAD_MISMATCH');
    assert.equal(decodePacket(padded, 0, full.byteLength).payloadLength, 8);
  });

  it('timestamp edges incl. MAX_SAFE_INTEGER', () => {
    for (const ts of [0, 1, Date.now(), Number.MAX_SAFE_INTEGER]) {
      const out = encodeAlloc({
        type: 1,
        seq: 1,
        timestampMs: ts,
        callId: UUID_A,
        payload: new Uint8Array(0),
      });
      assert.equal(decodePacket(out).timestampMs, ts);
    }
  });
});

describe('uuid helpers', () => {
  it('parse/format roundtrip incl. uppercase input', () => {
    const out = new Uint8Array(16);
    parseUuidInto(out, 0, UUID_A.toUpperCase());
    assert.equal(formatUuid(out, 0), UUID_A);
  });
});

describe('golden vectors (vectors/v1.json — shared cross-language contract)', () => {
  const doc = require('../vectors/v1.json');
  assert.equal(doc.version, 1);
  for (const v of doc.vectors) {
    it(v.name, () => {
      const payload = new Uint8Array(Buffer.from(v.payloadHex, 'hex'));
      const out = encodeAlloc({
        type: v.type,
        seq: v.seq,
        timestampMs: v.timestampMs,
        callId: v.callId,
        payload,
      });
      assert.equal(toHex(out), v.expectedHex);
      const back = decodePacket(new Uint8Array(Buffer.from(v.expectedHex, 'hex')));
      assert.equal(back.type, v.type);
      assert.equal(back.seq, v.seq);
      assert.equal(back.timestampMs, v.timestampMs);
      assert.equal(back.callId, v.callId);
      assert.equal(back.payloadLength, payload.byteLength);
      assert.ok(equalBytes(back.payload, payload));
    });
  }
});
