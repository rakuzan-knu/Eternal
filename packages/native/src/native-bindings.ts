/**
 * Optional Rust (napi-rs) accelerator loader.
 *
 * Contract (never break it):
 *  - Zero hard dependencies. The backend works identically with or without
 *    the native binary — this module only ever returns null on failure.
 *  - tryLoadNative() never throws for load/link/ABI problems (returns null).
 *    The only throw is fail-fast mode MSG_CODEC=native with no usable binary.
 *  - Every loaded binary MUST pass a cross-check against the TS
 *    implementation before it is trusted. A binary that disagrees with the
 *    TS codec is treated exactly like a missing binary.
 *  - Selection via MSG_CODEC: 'auto' (default) | 'ts' | 'native'.
 *
 * Prebuild layout (published by .github/workflows/native-prebuild.yml):
 *   node_modules/@social-network/native-<platform>-<arch>[-<libc>]/
 *     └── index.js  (re-exports the .node binary)
 * Local dev builds: <packageRoot>/prebuilds/msg-codec.<triple>.node
 *
 * napi naming: #[napi] fns are exported camelCase, #[napi(object)] fields
 * keep their Rust snake_case names — mirrored in the interfaces below.
 */

import * as path from 'node:path';
import { MsgCodecError } from '@social-network/msg-codec';
import { decodeHeader, decodePacket, encodeAlloc } from '@social-network/msg-codec';
import type { CodecBackendName, EncodeInput, PacketHeader } from './types';
import type { BufferDecodedPacket } from './buffer';

export interface NativeDecodedHeader {
  readonly packet_type: number;
  readonly seq: number;
  readonly timestamp_ms: number;
  readonly call_id: string;
  readonly payload_length: number;
}

export interface NativeDecodedPacket extends NativeDecodedHeader {
  readonly payload: Buffer;
}

export interface NativeBinding {
  codecVersion(): number;
  selfTest?(): boolean;
  encodeAlloc(
    packetType: number,
    seq: number,
    timestampMs: number,
    callId: string,
    payload: Buffer,
  ): Buffer;
  encodeInto(
    dst: Buffer,
    dstOffset: number,
    packetType: number,
    seq: number,
    timestampMs: number,
    callId: string,
    payload: Buffer,
    payloadOffset: number,
    payloadLength: number,
  ): number;
  decodeHeader(src: Buffer, offset: number): NativeDecodedHeader;
  decodePacket(src: Buffer, offset: number): NativeDecodedPacket;
}

export const NATIVE_BINDING_VERSION = 1 as const;

export type CodecSelection = 'auto' | 'ts' | 'native';

export function parseSelection(value?: string): CodecSelection {
  const mode = (value ?? process.env['MSG_CODEC'] ?? 'auto').toLowerCase();
  if (mode === 'ts' || mode === 'native' || mode === 'auto') return mode;
  return 'auto';
}

/** Ordered triples to probe: gnu first, musl fallback on linux. */
function candidateTriples(): string[] {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === 'linux') {
    return [`linux-${arch}-gnu`, `linux-${arch}-musl`];
  }
  return [`${platform}-${arch}`];
}

function isCompatibleBinding(value: unknown): value is NativeBinding {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b['encodeAlloc'] === 'function' &&
    typeof b['encodeInto'] === 'function' &&
    typeof b['decodeHeader'] === 'function' &&
    typeof b['decodePacket'] === 'function'
  );
}

function normalizeCallId(callId: EncodeInput['callId']): string {
  if (typeof callId === 'string') return callId;
  const hex = Buffer.from(callId.buffer, callId.byteOffset, callId.byteLength).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function normalizePayload(input: EncodeInput): { payload: Buffer; offset: number; length: number } {
  const offset = input.payloadOffset ?? 0;
  const length = input.payloadLength ?? input.payload.byteLength - offset;
  const payload = Buffer.isBuffer(input.payload)
    ? input.payload
    : Buffer.from(input.payload.buffer, input.payload.byteOffset, input.payload.byteLength);
  return { payload, offset, length };
}

/**
 * Cross-checks the binary against the TS implementation on fixed vectors.
 * Deterministic: a broken ABI fails every time, never flaky.
 */
function crossCheckBinding(binding: NativeBinding): boolean {
  try {
    if (typeof binding.codecVersion === 'function' && binding.codecVersion() !== 1) {
      return false;
    }
    if (typeof binding.selfTest === 'function' && binding.selfTest() !== true) {
      return false;
    }
    const vectors = [
      {
        type: 0,
        seq: 0,
        ts: 0,
        uuid: '00000000-0000-0000-0000-000000000000',
        bytes: [] as number[],
      },
      {
        type: 7,
        seq: 424242,
        ts: 1700000000000,
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        bytes: [0xde, 0xad, 0xbe, 0xef],
      },
      {
        type: 65535,
        seq: 4294967295,
        ts: 281474976710655,
        uuid: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        bytes: [0x00, 0xff, 0x01],
      },
    ];
    for (const v of vectors) {
      const payload = Buffer.from(v.bytes);
      const fromTs = encodeAlloc({
        type: v.type,
        seq: v.seq,
        timestampMs: v.ts,
        callId: v.uuid,
        payload,
      });
      const fromNative = binding.encodeAlloc(v.type, v.seq, v.ts, v.uuid, payload);
      if (Buffer.compare(fromTs, fromNative) !== 0) return false;
      // The binding speaks Buffers; the core returns Uint8Array views.
      const fromTsBuf = Buffer.from(fromTs.buffer, fromTs.byteOffset, fromTs.byteLength);
      const back = binding.decodePacket(fromTsBuf, 0);
      const expected = decodePacket(fromTs, 0);
      if (
        back.packet_type !== expected.type ||
        back.seq !== expected.seq ||
        back.timestamp_ms !== expected.timestampMs ||
        back.call_id !== expected.callId ||
        back.payload_length !== expected.payloadLength ||
        Buffer.compare(back.payload, expected.payload) !== 0
      ) {
        return false;
      }
      const header = binding.decodeHeader(fromTsBuf, 0);
      const expectedHeader = decodeHeader(fromTs, 0);
      if (
        header.packet_type !== expectedHeader.type ||
        header.call_id !== expectedHeader.callId ||
        header.payload_length !== expectedHeader.payloadLength
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** Loads and cross-checks the native binding, or returns null. See contract above. */
export function tryLoadNative(): NativeBinding | null {
  const selection = parseSelection();
  if (selection === 'ts') return null;

  const attempts: string[] = [];
  const failures: string[] = [];
  for (const triple of candidateTriples()) {
    attempts.push(
      `@social-network/native-${triple}`,
      path.join(__dirname, '..', 'prebuilds', `msg-codec.${triple}.node`),
    );
  }
  for (const candidate of attempts) {
    try {
      // Dynamic require by design: the binary is optional. Never static-import.
      const loaded: unknown = require(candidate);
      const binding = (loaded as { default?: unknown }).default ?? loaded;
      if (!isCompatibleBinding(binding)) {
        failures.push(`${candidate}: incompatible ABI`);
        continue;
      }
      if (!crossCheckBinding(binding)) {
        failures.push(`${candidate}: cross-check failed`);
        continue;
      }
      return binding;
    } catch (err) {
      failures.push(`${candidate}: ${(err as Error).message}`);
    }
  }
  if (selection === 'native') {
    throw new MsgCodecError(
      'NATIVE_SELFTEST_FAILED',
      `MSG_CODEC=native but no usable binary: ${failures.join(' | ')}`,
    );
  }
  return null;
}

export function backendNameOf(binding: NativeBinding | null): CodecBackendName {
  return binding === null ? 'ts' : 'native';
}

/** Adapts a verified native binding to the EncodeInput/PacketHeader surface. */
export function createNativeFacade(binding: NativeBinding): {
  encodeInto(dst: Buffer, dstOffset: number, input: EncodeInput): number;
  encodeAlloc(input: EncodeInput): Buffer;
  decodeHeader(src: Buffer, offset?: number): PacketHeader;
  decodePacket(src: Buffer, offset?: number, end?: number): BufferDecodedPacket;
} {
  return {
    encodeInto(dst: Buffer, dstOffset: number, input: EncodeInput): number {
      const { payload, offset, length } = normalizePayload(input);
      return binding.encodeInto(
        dst,
        dstOffset,
        input.type,
        input.seq,
        input.timestampMs,
        normalizeCallId(input.callId),
        payload,
        offset,
        length,
      );
    },
    encodeAlloc(input: EncodeInput): Buffer {
      const { payload, offset, length } = normalizePayload(input);
      const slice =
        offset === 0 && length === payload.byteLength
          ? payload
          : payload.subarray(offset, offset + length);
      return binding.encodeAlloc(
        input.type,
        input.seq,
        input.timestampMs,
        normalizeCallId(input.callId),
        slice,
      );
    },
    decodeHeader(src: Buffer, offset = 0): PacketHeader {
      const h = binding.decodeHeader(src, offset);
      return {
        type: h.packet_type,
        seq: h.seq,
        timestampMs: h.timestamp_ms,
        callId: h.call_id,
        payloadLength: h.payload_length,
      };
    },
    decodePacket(src: Buffer, offset = 0, end?: number): BufferDecodedPacket {
      const native = binding.decodePacket(src, offset);
      const total = 36 + native.payload_length;
      if (src.byteLength - offset < total) {
        throw new MsgCodecError('TRUNCATED', `need ${total} packet bytes`);
      }
      if (end !== undefined && end - offset !== total) {
        throw new MsgCodecError('PAYLOAD_MISMATCH', 'framed length differs from packet');
      }
      return {
        type: native.packet_type,
        seq: native.seq,
        timestampMs: native.timestamp_ms,
        callId: native.call_id,
        payloadLength: native.payload_length,
        payload: Buffer.isBuffer(native.payload) ? native.payload : Buffer.from(native.payload),
      };
    },
  };
}
