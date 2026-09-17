/**
 * Buffer-typed wrappers over the portable @social-network/msg-codec core.
 *
 * Why this file exists: Node's Buffer extends Uint8Array, so the core works
 * on Buffers directly — these wrappers only adjust TYPES (Buffer in/out)
 * for backend ergonomics. Zero extra logic, zero extra copies on the hot
 * path (encodeAlloc returns a zero-copy Buffer view over the core output).
 */

import {
  decodeHeader as coreDecodeHeader,
  decodePacket as coreDecodePacket,
  encodeAlloc as coreEncodeAlloc,
  encodeInto as coreEncodeInto,
  packetTotalLength as corePacketTotalLength,
} from '@social-network/msg-codec';
import type { EncodeInput, PacketHeader } from '@social-network/msg-codec';

export interface BufferDecodedPacket extends PacketHeader {
  /** Zero-copy view into the source Buffer (a Buffer at runtime). */
  readonly payload: Buffer;
}

export function encodeInto(dst: Buffer, dstOffset: number, input: EncodeInput): number {
  return coreEncodeInto(dst, dstOffset, input);
}

export function encodeAlloc(input: EncodeInput): Buffer {
  const view = coreEncodeAlloc(input);
  return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
}

export function decodeHeader(src: Buffer, offset = 0): PacketHeader {
  return coreDecodeHeader(src, offset);
}

export function decodePacket(src: Buffer, offset = 0, end?: number): BufferDecodedPacket {
  const decoded = coreDecodePacket(src, offset, end);
  return {
    type: decoded.type,
    seq: decoded.seq,
    timestampMs: decoded.timestampMs,
    callId: decoded.callId,
    payloadLength: decoded.payloadLength,
    payload: decoded.payload as Buffer,
  };
}

export function packetTotalLength(src: Buffer, offset = 0): number {
  return corePacketTotalLength(src, offset);
}
