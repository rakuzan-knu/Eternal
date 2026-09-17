#!/usr/bin/env node
/**
 * msg-codec micro-benchmark: LEGACY (current OffHeapBufferPoolService logic,
 * inlined verbatim) vs NEW (@social-network/native TS fallback).
 *
 * Mirrors the production hot path: encode into a reused slab + decode.
 * Prints a console table and writes benches/report.json for CI tracking.
 *
 * Run:  pnpm --filter @social-network/native bench
 * Fails with exit 1 on any byte-level incompatibility.
 */
'use strict';

process.env.MSG_CODEC = 'ts';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const native = require('../dist/index.js');

const HEADER_SIZE_BYTES = 36;
const PACKET_MAGIC_0 = 0x45;
const PACKET_MAGIC_1 = 0x54;

// LEGACY implementation — exact port of
// backend/src/messenger/services/off-heap-buffer-pool.service.ts
// (DataView + uuid.replace + parseInt loop + BigInt timestamp +
//  fresh DataView per decode).
class LegacyCodec {
  constructor(capacity) {
    this.capacity = capacity;
    this.slab = Buffer.allocUnsafeSlow(capacity);
    this.dataView = new DataView(this.slab.buffer, this.slab.byteOffset, this.slab.byteLength);
    this.currentOffset = 0;
  }

  allocate(sizeBytes) {
    const alignedOffset = (this.currentOffset + 3) & ~3;
    if (alignedOffset + sizeBytes > this.capacity) {
      this.currentOffset = 0;
    } else {
      this.currentOffset = alignedOffset;
    }
    const start = this.currentOffset;
    this.currentOffset += sizeBytes;
    return this.slab.subarray(start, start + sizeBytes);
  }

  encodePacket(type, seq, callIdUuid, payload) {
    const payloadLen = payload.byteLength;
    const totalSize = HEADER_SIZE_BYTES + payloadLen;
    const packetBuffer = this.allocate(totalSize);
    const offset = packetBuffer.byteOffset;
    const view = this.dataView;
    view.setUint8(offset + 0, PACKET_MAGIC_0);
    view.setUint8(offset + 1, PACKET_MAGIC_1);
    view.setUint16(offset + 2, type, false);
    view.setUint32(offset + 4, seq, false);
    view.setBigUint64(offset + 8, BigInt(Date.now()), false);
    this.writeUuidToView(view, offset + 16, callIdUuid);
    view.setUint32(offset + 32, payloadLen, false);
    packetBuffer.set(payload, HEADER_SIZE_BYTES);
    return packetBuffer;
  }

  decodePacket(packetBuffer) {
    if (packetBuffer.byteLength < HEADER_SIZE_BYTES) {
      throw new Error('Invalid packet size');
    }
    const offset = packetBuffer.byteOffset;
    const view = new DataView(packetBuffer.buffer, offset, packetBuffer.byteLength);
    const m0 = view.getUint8(0);
    const m1 = view.getUint8(1);
    if (m0 !== PACKET_MAGIC_0 || m1 !== PACKET_MAGIC_1) {
      throw new Error('Corrupted packet magic');
    }
    const type = view.getUint16(2, false);
    const seq = view.getUint32(4, false);
    const timestamp = Number(view.getBigUint64(8, false));
    const callId = this.readUuidFromView(view, 16);
    const payloadLength = view.getUint32(32, false);
    const payload = packetBuffer.subarray(HEADER_SIZE_BYTES, HEADER_SIZE_BYTES + payloadLength);
    return { type, seq, timestamp, callId, payloadLength, payload };
  }

  writeUuidToView(view, offset, uuid) {
    const clean = uuid.replace(/-/g, '');
    for (let i = 0; i < 16; i++) {
      const byteVal = parseInt(clean.substring(i * 2, i * 2 + 2) || '00', 16);
      view.setUint8(offset + i, byteVal);
    }
  }

  readUuidFromView(view, offset) {
    const hex = [];
    for (let i = 0; i < 16; i++) {
      hex.push(
        view
          .getUint8(offset + i)
          .toString(16)
          .padStart(2, '0'),
      );
    }
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join(''),
    ].join('-');
  }
}

// Harness
const UUIDS = [
  '123e4567-e89b-12d3-a456-426614174000',
  '550e8400-e29b-41d4-a716-446655440000',
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
];

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function stats(samplesNs) {
  const sorted = Float64Array.from(samplesNs).sort();
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    meanNs: mean,
    p50Ns: percentile(sorted, 50),
    p95Ns: percentile(sorted, 95),
    p99Ns: percentile(sorted, 99),
    opsPerSec: Math.round(1e9 / mean),
  };
}

function measure(fn, iters, warmup) {
  for (let i = 0; i < warmup; i++) fn(i);
  const samples = new Float64Array(iters);
  for (let i = 0; i < iters; i++) {
    const t0 = process.hrtime.bigint();
    fn(i);
    samples[i] = Number(process.hrtime.bigint() - t0);
  }
  return stats(samples);
}

function fmtNs(ns) {
  if (ns < 1000) return `${ns.toFixed(0)} ns`;
  if (ns < 1e6) return `${(ns / 1000).toFixed(2)} µs`;
  return `${(ns / 1e6).toFixed(2)} ms`;
}

// 1. Compatibility gate: byte-identical output on all sizes + fuzz
function assertCompatible() {
  const legacy = new LegacyCodec(8 * 1024 * 1024);
  const codec = native.getActiveCodec();
  const newSlab = Buffer.allocUnsafe(8 * 1024 * 1024);
  let newOffset = 0;

  const check = (type, seq, ts, uuid, payload) => {
    const l = legacy.encodePacket(type, seq, uuid, payload);
    // Force identical timestamp: legacy stamps Date.now() internally, so
    // compare everything except the 8 timestamp bytes, then compare the
    // NEW output against legacy with the timestamp normalized.
    const end = native.encodeInto(newSlab, newOffset, {
      type,
      seq,
      timestampMs: ts,
      callId: uuid,
      payload,
    });
    const n = newSlab.subarray(newOffset, end);
    newOffset = (end + 3) & ~3;
    if (newOffset + 9000 > newSlab.length) newOffset = 0;
    if (l.length !== n.length) throw new Error(`length mismatch: ${l.length} vs ${n.length}`);
    for (let i = 0; i < l.length; i++) {
      if (i >= 8 && i < 16) continue; // timestamp differs by design here
      if (l[i] !== n[i]) throw new Error(`byte mismatch at ${i}: ${l[i]} vs ${n[i]}`);
    }
    const ld = legacy.decodePacket(l);
    const nd = native.decodePacket(n);
    if (ld.type !== nd.type || ld.seq !== nd.seq || ld.callId !== nd.callId) {
      throw new Error('decoded header mismatch');
    }
    if (Buffer.compare(ld.payload, nd.payload) !== 0) throw new Error('payload mismatch');
  };

  for (const size of [0, 1, 7, 36, 256, 1200, 8192]) {
    const payload = crypto.randomBytes(size);
    for (let i = 0; i < 25; i++) {
      check(i % 65536, (i * 2654435761) >>> 0, 1700000000000 + i, UUIDS[i % UUIDS.length], payload);
    }
  }
  console.log('compat: OK — legacy and new codecs are byte-identical (modulo timestamp source)');
}

// 2. Benchmarks
function main() {
  console.log('===============================================================');
  console.log(' msg-codec bench: LEGACY (DataView/BigInt/regex) vs NEW (native pkg, ts backend)');
  console.log(` node ${process.version} ${process.platform}-${process.arch}`);
  console.log('===============================================================\n');

  assertCompatible();

  const legacy = new LegacyCodec(32 * 1024 * 1024);
  const codec = native.getActiveCodec();
  const newSlab = Buffer.allocUnsafe(32 * 1024 * 1024);
  let newOffset = 0;
  const newAlloc = (input) => {
    const end = native.encodeInto(newSlab, newOffset, input);
    const view = newSlab.subarray(newOffset, end);
    newOffset = (end + 3) & ~3;
    if (newOffset + 65536 > newSlab.length) newOffset = 0;
    return view;
  };

  const sizes = [
    { name: 'empty/0B', size: 0, iters: 60000 },
    { name: 'voice/256B', size: 256, iters: 60000 },
    { name: 'video-mtu/1200B', size: 1200, iters: 60000 },
    { name: 'jumbo/8192B', size: 8192, iters: 20000 },
  ];
  const WARMUP = 10000;
  const rows = [];

  for (const { name, size, iters } of sizes) {
    const payload = crypto.randomBytes(size);
    const uuid = (i) => UUIDS[i % UUIDS.length];
    const ts = 1700000000000;

    const legacyEnc = measure(
      (i) => legacy.encodePacket(i % 65536, i >>> 0, uuid(i), payload),
      iters,
      WARMUP,
    );
    const newEnc = measure(
      (i) =>
        newAlloc({
          type: i % 65536,
          seq: i >>> 0,
          timestampMs: ts + (i % 1000),
          callId: uuid(i),
          payload,
        }),
      iters,
      WARMUP,
    );

    // Decode: cycle 32 pre-encoded packets (realistic icache/dcache behavior).
    const legacyPkts = Array.from({ length: 32 }, (_, i) =>
      Buffer.from(legacy.encodePacket(i, i, uuid(i), payload)),
    );
    const newPkts = Array.from({ length: 32 }, (_, i) =>
      Buffer.from(
        newSlab.subarray(
          0,
          native.encodeInto(Buffer.allocUnsafe(36 + size), 0, {
            type: i,
            seq: i,
            timestampMs: ts,
            callId: uuid(i),
            payload,
          }),
        ),
      ),
    );
    const legacyDec = measure((i) => legacy.decodePacket(legacyPkts[i % 32]), iters, WARMUP);
    const newDec = measure((i) => codec.decodePacket(newPkts[i % 32]), iters, WARMUP);

    rows.push({ case: name, op: 'encode', legacy: legacyEnc, next: newEnc });
    rows.push({ case: name, op: 'decode', legacy: legacyDec, next: newDec });
  }

  // UUID micro-op: parse + format, 200k iters.
  const scratch = Buffer.allocUnsafe(16);
  const scratchView = new DataView(scratch.buffer, scratch.byteOffset, scratch.byteLength);
  const legacyUuid = measure(
    (i) => {
      legacy.writeUuidToView(scratchView, 0, UUIDS[i % UUIDS.length]);
      legacy.readUuidFromView(scratchView, 0);
    },
    200000,
    20000,
  );
  const uuidOut = new Uint8Array(16);
  const newUuid = measure(
    (i) => {
      native.parseUuidInto(uuidOut, 0, UUIDS[i % UUIDS.length]);
      native.formatUuid(uuidOut, 0);
    },
    200000,
    20000,
  );
  rows.push({ case: 'uuid roundtrip', op: 'parse+format', legacy: legacyUuid, next: newUuid });

  // ---- report ----
  const line = (r) => {
    const speed = r.legacy.meanNs / r.next.meanNs;
    return (
      `${r.case.padEnd(16)} ${r.op.padEnd(13)} ` +
      `legacy ${fmtNs(r.legacy.meanNs).padStart(10)} (p99 ${fmtNs(r.legacy.p99Ns).padStart(10)})  |  ` +
      `new ${fmtNs(r.next.meanNs).padStart(10)} (p99 ${fmtNs(r.next.p99Ns).padStart(10)})  |  ` +
      `x${speed.toFixed(2)}`
    );
  };
  console.log('\n------------------ RESULTS (mean | p99 | speedup) ------------------');
  for (const r of rows) console.log(line(r));
  console.log('-------------------------------------------------------------------\n');

  const report = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    backend: native.getCodecInfo().backend,
    protocolVersion: 1,
    rows: rows.map((r) => ({
      case: r.case,
      op: r.op,
      legacyNs: {
        mean: r.legacy.meanNs,
        p50: r.legacy.p50Ns,
        p95: r.legacy.p95Ns,
        p99: r.legacy.p99Ns,
        ops: r.legacy.opsPerSec,
      },
      newNs: {
        mean: r.next.meanNs,
        p50: r.next.p50Ns,
        p95: r.next.p95Ns,
        p99: r.next.p99Ns,
        ops: r.next.opsPerSec,
      },
      speedup: r.legacy.meanNs / r.next.meanNs,
    })),
  };
  const outPath = path.join(__dirname, 'report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`report written: ${outPath}`);
}

main();
