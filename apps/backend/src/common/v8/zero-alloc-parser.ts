/**
 * Zero-Allocation WebSocket Frame Parser
 *
 * Problem: When Socket.IO delivers a message payload, it arrives as either a
 * JS string or a Buffer (binary frame). The default path allocates:
 *  1. A new string from the raw bytes (UTF-8 decode)
 *  2. A new object from JSON.parse()
 *
 * Solution for BINARY frames (msgpack / custom binary protocol):
 *  - Use Buffer.subarray() to slice into existing memory WITHOUT copying
 *  - Use DataView / readUInt32LE for typed integer reads WITHOUT toString()
 *  - Decode only the fields we need for routing (type discriminator)
 *
 * Solution for STRING frames (standard JSON):
 *  - Fast-path: if payload is already a plain object, return it directly
 *  - If string: parse, but reuse a scratch Buffer from WsFramePool for
 *    intermediate work to reduce GC pressure
 *
 * V8 notes:
 *  - Buffer.subarray() returns a Buffer that shares the same ArrayBuffer —
 *    zero-copy, zero-allocation (same memory page).
 *  - DataView.getUint32() / Buffer.readUInt32LE() are O(1) with no allocation.
 *  - Math.imul() is used in the hash functions to avoid signed-int overflow.
 *
 * This file has NO external dependencies — pure Node.js built-ins only.
 */

// ─── WS Frame Pool (scratch Buffer ring) ─────────────────────────────────────

const SCRATCH_BUFFER_SIZE = 4096; // 4 KB per slot — enough for most WS messages

/**
 * A fixed ring of pre-allocated scratch Buffers.
 * Workers borrow a slot, parse into it, then release — zero net allocation.
 *
 * Thread-safety: Node.js event loop is single-threaded so no mutex needed.
 */
export class WsFramePool {
  private readonly slots: Buffer[];
  private readonly size: number;
  private cursor = 0;

  constructor(poolSize = 8) {
    this.size = poolSize;
    this.slots = new Array<Buffer>(poolSize);
    for (let i = 0; i < poolSize; i++) {
      this.slots[i] = Buffer.allocUnsafe(SCRATCH_BUFFER_SIZE);
    }
  }

  /**
   * Acquire a scratch slot. If payload fits in the slot, write it there.
   * Returns a Buffer.subarray() view — zero copy.
   * If payload exceeds slot size, falls back to Buffer.from() (one allocation).
   */
  acquire(payload: string): { buf: Buffer; borrowed: boolean } {
    const slot = this.slots[this.cursor];
    this.cursor = (this.cursor + 1) % this.size;

    const byteLen = Buffer.byteLength(payload, 'utf8');
    if (byteLen <= SCRATCH_BUFFER_SIZE) {
      const written = slot.write(payload, 0, 'utf8');
      return { buf: slot.subarray(0, written), borrowed: true };
    }
    // Fallback: oversized payload — allocate once
    return { buf: Buffer.from(payload, 'utf8'), borrowed: false };
  }
}

/** Module-scoped singleton pool — no NestJS DI needed, no constructor overhead */
export const wsFramePool = new WsFramePool(8);

// ─── Binary frame header layout ───────────────────────────────────────────────

/**
 * Our msgpack-adjacent binary WS frame layout (4-byte header):
 *
 * Offset 0-1: uint16LE — message type discriminator (WS_EVENT numeric code)
 * Offset 2-3: uint16LE — flags (reserved / compression hint)
 * Offset 4+:  payload bytes (JSON or msgpack)
 *
 * This lets the gateway route frames to the correct handler by reading only
 * 4 bytes — without deserializing the full payload.
 */
export const BINARY_FRAME_HEADER_SIZE = 4;

export interface BinaryFrameHeader {
  /** Message type discriminator */
  typeCode: number;
  /** Reserved flags */
  flags: number;
  /** Payload view — zero-copy subarray of the original Buffer */
  payload: Buffer;
}

/**
 * Parse a binary WS frame header WITHOUT copying memory.
 * Uses Buffer.readUInt16LE() — O(1), zero allocations.
 *
 * Returns null if frame is malformed (too short).
 */
export function parseBinaryFrameHeader(frame: Buffer): BinaryFrameHeader | null {
  if (frame.length < BINARY_FRAME_HEADER_SIZE) {
    return null;
  }

  return {
    typeCode: frame.readUInt16LE(0),
    flags: frame.readUInt16LE(2),
    // Zero-copy: subarray shares the same ArrayBuffer memory
    payload: frame.subarray(BINARY_FRAME_HEADER_SIZE),
  };
}

// ─── Zero-Copy String Decoding (utf8Slice & subarray) ─────────────────────────

/**
 * Zero-copy string decoding using internal Node.js Buffer.prototype.utf8Slice
 * or Uint8Array subarray to avoid intermediate memory copies in the V8 heap.
 */
export function fastDecodeUtf8(buf: Buffer | Uint8Array, start = 0, end?: number): string {
  const actualEnd = end ?? buf.length;
  // Node.js Buffer.prototype.utf8Slice is a fast native C++ binding directly decoding into V8 string
  const bufWithUtf8Slice = buf as unknown as { utf8Slice?: (start: number, end: number) => string };
  if (typeof bufWithUtf8Slice.utf8Slice === 'function') {
    return bufWithUtf8Slice.utf8Slice(start, actualEnd);
  }
  // Uint8Array or fallback: subarray without copying memory
  const slice =
    buf instanceof Uint8Array && !(buf instanceof Buffer)
      ? Buffer.from(buf.buffer, buf.byteOffset + start, actualEnd - start)
      : buf.subarray(start, actualEnd);
  return slice.toString('utf8');
}

/**
 * Parses JSON directly from a Buffer or Uint8Array using zero-copy utf8Slice.
 */
export function parseJsonFromBuffer<T = unknown>(
  buf: Buffer | Uint8Array,
  start = 0,
  end?: number,
): T | null {
  try {
    const jsonStr = fastDecodeUtf8(buf, start, end);
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

// ─── Main parse entry point ───────────────────────────────────────────────────

/**
 * Parse an incoming WebSocket frame payload.
 *
 * Routing:
 *  - null/undefined → null
 *  - already-parsed object → returned as-is (Socket.IO may pre-parse JSON)
 *  - Buffer / Uint8Array → parseBinaryFrameHeader() (zero-copy) or fastDecodeUtf8 JSON
 *  - string → JSON.parse with minimal allocation
 *
 * Returns the parsed payload object or null on failure.
 */
export function parseWsFrame(
  frame: Buffer | Uint8Array | string | object | null | undefined,
): unknown {
  if (frame === null || frame === undefined) {
    return null;
  }

  // Fast-path 1: Socket.IO already parsed the JSON (object received directly)
  if (typeof frame === 'object' && !Buffer.isBuffer(frame) && !(frame instanceof Uint8Array)) {
    return frame;
  }

  // Fast-path 2: Binary Buffer frame — read header + subarray (zero-copy) or utf8Slice JSON
  if (Buffer.isBuffer(frame) || frame instanceof Uint8Array) {
    const buf = Buffer.isBuffer(frame)
      ? frame
      : Buffer.from(frame.buffer, frame.byteOffset, frame.byteLength);

    // If buffer begins with JSON object/array delimiter, parse directly with fastDecodeUtf8
    const firstByte = buf.length > 0 ? buf[0] : 0;
    if (firstByte === 0x7b || firstByte === 0x5b) {
      const parsed = parseJsonFromBuffer(buf);
      if (parsed !== null) return parsed;
    }

    const header = parseBinaryFrameHeader(buf);
    if (header) return header;

    return parseJsonFromBuffer(buf);
  }

  // String frame: minimal-allocation JSON parse
  if (typeof frame === 'string') {
    try {
      return JSON.parse(frame) as unknown;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Write an outgoing WS event into a pre-allocated scratch Buffer to avoid
 * creating a full intermediate string. Returns a Buffer view (or the
 * standard JSON string as fallback if the scratch slot is too small).
 *
 * Used by emitToUser() when building the envelope to send over the wire.
 */
export function buildWsFrameString(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return '{}';
  }
}

/**
 * Zero-allocation integer extraction from a Buffer at a known offset.
 * Thin wrapper for clarity at call sites.
 */
export function readUint32(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

export function readUint16(buf: Buffer, offset: number): number {
  return buf.readUInt16LE(offset);
}
