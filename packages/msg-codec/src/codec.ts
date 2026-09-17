/**
 * Portable table-driven implementation of msg-codec v1.
 *
 * Platform rules for this file (enforced by review, not just convention):
 *  - Uint8Array only. No Buffer, no node: imports, no process/env access.
 *  - Integers via explicit shifts, never DataView (faster on JSC/Hermes/V8)
 *    and allocation-free.
 *  - Timestamp as two u32 halves: exact for all Date.now() values (< 2^53),
 *    no BigInt (BigInt is slow or missing on some mobile runtimes).
 *  - UUID via frozen lookup tables: no regex, no substring, no parseInt.
 *
 * Byte-identical to the legacy backend encoding. The Rust (napi) accelerator
 * in packages/native/rust mirrors this file line-for-line in behavior.
 */

import { MsgCodecError } from './errors';
import {
  CALL_ID_BYTES,
  CANONICAL_UUID_CHARS,
  HEADER_SIZE_BYTES,
  MAX_PAYLOAD_BYTES,
  MAX_SEQ,
  MAX_PACKET_TYPE,
  MAX_TIMESTAMP_MS,
  OFFSET_CALL_ID,
  OFFSET_MAGIC,
  OFFSET_PAYLOAD_LEN,
  OFFSET_SEQ,
  OFFSET_TIMESTAMP,
  OFFSET_TYPE,
  PACKET_MAGIC_0,
  PACKET_MAGIC_1,
} from './protocol';
import type { CallIdInput, DecodedPacket, EncodeInput, PacketHeader } from './types';

// Lookup tables (built once, frozen)

/** Byte -> two lowercase hex chars, e.g. HEX_PAIR[0xab] === 'ab'. */
const HEX_PAIR: readonly string[] = (() => {
  const table = new Array<string>(256);
  for (let i = 0; i < 256; i++) {
    table[i] = i.toString(16).padStart(2, '0');
  }
  return Object.freeze(table);
})();

/** Char code -> nibble, -1 sentinel for "not hex". Covers 0-9, a-f, A-F. */
const HEX_NIBBLE: Readonly<Int8Array> = (() => {
  const table = new Int8Array(256).fill(-1);
  for (let i = 0; i <= 9; i++) table[0x30 + i] = i;
  for (let i = 0; i < 6; i++) {
    table[0x61 + i] = 10 + i;
    table[0x41 + i] = 10 + i;
  }
  return table;
})();

// Big-endian integer ops (explicit shifts beat DataView on every engine)

function writeU16BE(dst: Uint8Array, offset: number, value: number): void {
  dst[offset] = (value >>> 8) & 0xff;
  dst[offset + 1] = value & 0xff;
}

function writeU32BE(dst: Uint8Array, offset: number, value: number): void {
  const v = value >>> 0;
  dst[offset] = (v >>> 24) & 0xff;
  dst[offset + 1] = (v >>> 16) & 0xff;
  dst[offset + 2] = (v >>> 8) & 0xff;
  dst[offset + 3] = v & 0xff;
}

function readU16BE(src: Uint8Array, offset: number): number {
  return (src[offset] << 8) | src[offset + 1];
}

function readU32BE(src: Uint8Array, offset: number): number {
  // Multiplication for the top byte avoids int32 sign pitfalls of << 24.
  return (
    src[offset] * 16777216 + ((src[offset + 1] << 16) | (src[offset + 2] << 8) | src[offset + 3])
  );
}

// Validation (cold path — clarity over cleverness)

function assertType(type: number): void {
  if (!Number.isInteger(type) || type < 0 || type > MAX_PACKET_TYPE) {
    throw new MsgCodecError('INVALID_TYPE', `expected uint16, got ${String(type)}`);
  }
}

function assertSeq(seq: number): void {
  if (!Number.isInteger(seq) || seq < 0 || seq > MAX_SEQ) {
    throw new MsgCodecError('INVALID_SEQ', `expected uint32, got ${String(seq)}`);
  }
}

function assertTimestamp(timestampMs: number): void {
  if (!Number.isInteger(timestampMs) || timestampMs < 0 || timestampMs > MAX_TIMESTAMP_MS) {
    throw new MsgCodecError(
      'INVALID_TIMESTAMP',
      `expected 0..2^53-1 millis, got ${String(timestampMs)}`,
    );
  }
}

function assertPayloadBounds(payloadLength: number): void {
  if (!Number.isInteger(payloadLength) || payloadLength < 0) {
    throw new MsgCodecError('PAYLOAD_MISMATCH', `negative payload length ${String(payloadLength)}`);
  }
  if (payloadLength > MAX_PAYLOAD_BYTES) {
    throw new MsgCodecError('PAYLOAD_TOO_LARGE', `${payloadLength} > ${MAX_PAYLOAD_BYTES}`);
  }
}

// UUID fast paths

/**
 * Parses a canonical 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' UUID directly
 * into 16 bytes. Single pass, no allocations.
 */
export function parseUuidInto(out: Uint8Array, outOffset: number, uuid: string): void {
  if (uuid.length !== CANONICAL_UUID_CHARS) {
    throw new MsgCodecError('INVALID_UUID', `expected 36 chars, got ${uuid.length}`);
  }
  // Hyphen positions in a canonical UUID: 8, 13, 18, 23.
  if (
    uuid.charCodeAt(8) !== 0x2d ||
    uuid.charCodeAt(13) !== 0x2d ||
    uuid.charCodeAt(18) !== 0x2d ||
    uuid.charCodeAt(23) !== 0x2d
  ) {
    throw new MsgCodecError('INVALID_UUID', 'misplaced hyphens');
  }
  let byteIndex = 0;
  let hi = -1;
  for (let i = 0; i < CANONICAL_UUID_CHARS; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) continue;
    const nibble = HEX_NIBBLE[uuid.charCodeAt(i)];
    if (nibble < 0) {
      throw new MsgCodecError('INVALID_UUID', `bad hex char at index ${i}`);
    }
    if (hi < 0) {
      hi = nibble;
    } else {
      out[outOffset + byteIndex] = (hi << 4) | nibble;
      byteIndex++;
      hi = -1;
    }
  }
}

/** Formats 16 bytes at offset as a canonical hyphenated UUID string. */
export function formatUuid(bytes: Uint8Array, offset: number): string {
  const h = HEX_PAIR;
  const o = offset;
  // Manual concat of 16 table lookups: faster than per-byte join maps,
  // single allocation for the result.
  return (
    h[bytes[o]] +
    h[bytes[o + 1]] +
    h[bytes[o + 2]] +
    h[bytes[o + 3]] +
    '-' +
    h[bytes[o + 4]] +
    h[bytes[o + 5]] +
    '-' +
    h[bytes[o + 6]] +
    h[bytes[o + 7]] +
    '-' +
    h[bytes[o + 8]] +
    h[bytes[o + 9]] +
    '-' +
    h[bytes[o + 10]] +
    h[bytes[o + 11]] +
    h[bytes[o + 12]] +
    h[bytes[o + 13]] +
    h[bytes[o + 14]] +
    h[bytes[o + 15]]
  );
}

/** Copies a CallIdInput into 16 bytes. String path validates, bytes path memcpys. */
export function writeCallIdInto(out: Uint8Array, outOffset: number, callId: CallIdInput): void {
  if (typeof callId === 'string') {
    parseUuidInto(out, outOffset, callId);
    return;
  }
  if (callId.byteLength !== CALL_ID_BYTES) {
    throw new MsgCodecError('INVALID_UUID', `expected 16 bytes, got ${callId.byteLength}`);
  }
  out.set(callId.subarray(0, CALL_ID_BYTES), outOffset);
}

// Encode

const TWO_POW_32 = 4294967296;

function writeTimestampMs(dst: Uint8Array, offset: number, timestampMs: number): void {
  assertTimestamp(timestampMs);
  writeU32BE(dst, offset, Math.floor(timestampMs / TWO_POW_32));
  writeU32BE(dst, offset + 4, timestampMs >>> 0);
}

function readTimestampMs(src: Uint8Array, offset: number): number {
  return readU32BE(src, offset) * TWO_POW_32 + readU32BE(src, offset + 4);
}

interface PayloadRange {
  readonly offset: number;
  readonly length: number;
}

function resolvePayloadRange(input: EncodeInput): PayloadRange {
  const payload = input.payload;
  const offset = input.payloadOffset ?? 0;
  const length = input.payloadLength ?? payload.byteLength - offset;
  if (!Number.isInteger(offset) || offset < 0 || offset > payload.byteLength) {
    throw new MsgCodecError('PAYLOAD_MISMATCH', `bad payload offset ${String(offset)}`);
  }
  assertPayloadBounds(length);
  if (offset + length > payload.byteLength) {
    throw new MsgCodecError('PAYLOAD_MISMATCH', 'payload range overflows buffer');
  }
  return { offset, length };
}

/**
 * Encodes one packet into `dst` at `dstOffset`. Returns the end offset
 * (dstOffset + HEADER_SIZE_BYTES + payloadLength). Throws MsgCodecError
 * with code BUFFER_TOO_SMALL when the destination is too short.
 */
export function encodeInto(dst: Uint8Array, dstOffset: number, input: EncodeInput): number {
  assertType(input.type);
  assertSeq(input.seq);
  const { offset: payloadOffset, length: payloadLength } = resolvePayloadRange(input);
  const total = HEADER_SIZE_BYTES + payloadLength;
  if (!Number.isInteger(dstOffset) || dstOffset < 0 || dst.byteLength - dstOffset < total) {
    throw new MsgCodecError(
      'BUFFER_TOO_SMALL',
      `need ${total} bytes at offset ${String(dstOffset)}, have ${Math.max(0, dst.byteLength - dstOffset)}`,
    );
  }

  const o = dstOffset;
  dst[o + OFFSET_MAGIC] = PACKET_MAGIC_0;
  dst[o + OFFSET_MAGIC + 1] = PACKET_MAGIC_1;
  writeU16BE(dst, o + OFFSET_TYPE, input.type);
  writeU32BE(dst, o + OFFSET_SEQ, input.seq);
  writeTimestampMs(dst, o + OFFSET_TIMESTAMP, input.timestampMs);
  writeCallIdInto(dst, o + OFFSET_CALL_ID, input.callId);
  writeU32BE(dst, o + OFFSET_PAYLOAD_LEN, payloadLength);

  if (payloadLength > 0) {
    dst.set(
      input.payload.subarray(payloadOffset, payloadOffset + payloadLength),
      o + HEADER_SIZE_BYTES,
    );
  }
  return o + total;
}

/** Stateless encode: allocates exactly HEADER + payload bytes. */
export function encodeAlloc(input: EncodeInput): Uint8Array {
  const { length: payloadLength } = resolvePayloadRange(input);
  const dst = new Uint8Array(HEADER_SIZE_BYTES + payloadLength);
  encodeInto(dst, 0, input);
  return dst;
}

// Decode

function assertHeaderAvailable(src: Uint8Array, offset: number): void {
  if (!Number.isInteger(offset) || offset < 0 || src.byteLength - offset < HEADER_SIZE_BYTES) {
    throw new MsgCodecError(
      'TRUNCATED',
      `need ${HEADER_SIZE_BYTES} header bytes, have ${Math.max(0, src.byteLength - offset)}`,
    );
  }
}

/**
 * Parses only the 36-byte header. Use for routing/filtering without
 * touching (or validating the presence of) the payload bytes.
 */
export function decodeHeader(src: Uint8Array, offset = 0): PacketHeader {
  assertHeaderAvailable(src, offset);
  const o = offset;
  if (src[o + OFFSET_MAGIC] !== PACKET_MAGIC_0 || src[o + OFFSET_MAGIC + 1] !== PACKET_MAGIC_1) {
    throw new MsgCodecError('INVALID_MAGIC', `expected 0x45 0x54 at offset ${o}`);
  }
  const payloadLength = readU32BE(src, o + OFFSET_PAYLOAD_LEN);
  assertPayloadBounds(payloadLength);
  return {
    type: readU16BE(src, o + OFFSET_TYPE),
    seq: readU32BE(src, o + OFFSET_SEQ),
    timestampMs: readTimestampMs(src, o + OFFSET_TIMESTAMP),
    callId: formatUuid(src, o + OFFSET_CALL_ID),
    payloadLength,
  };
}

/**
 * Full decode. `payload` is a zero-copy view into `src`.
 * When `end` is provided it must exactly match the packet boundary,
 * otherwise PAYLOAD_MISMATCH is thrown (stream framing protection).
 */
export function decodePacket(src: Uint8Array, offset = 0, end?: number): DecodedPacket {
  const header = decodeHeader(src, offset);
  const total = HEADER_SIZE_BYTES + header.payloadLength;
  const limit = end ?? src.byteLength;
  if (limit - offset < total) {
    throw new MsgCodecError(
      'TRUNCATED',
      `need ${total} packet bytes, have ${Math.max(0, limit - offset)}`,
    );
  }
  if (end !== undefined && end - offset !== total) {
    throw new MsgCodecError(
      'PAYLOAD_MISMATCH',
      `framed ${end - offset} bytes but packet is ${total}`,
    );
  }
  return {
    ...header,
    payload: src.subarray(offset + HEADER_SIZE_BYTES, offset + total),
  };
}

/** Total on-wire length of the packet starting at offset (header + payload). */
export function packetTotalLength(src: Uint8Array, offset = 0): number {
  return HEADER_SIZE_BYTES + decodeHeader(src, offset).payloadLength;
}
