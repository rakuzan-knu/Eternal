/**
 * Portable codec types. Only Uint8Array — never Buffer — so the same
 * signatures type-check on web, React Native / Hermes, Electron, and Node.
 * (Node's Buffer extends Uint8Array, so Buffers are accepted everywhere
 * a Uint8Array is expected, and Buffer.subarray views come back out.)
 */

/** UUID in canonical hyphenated form or as raw 16 bytes. Raw bytes skip parsing entirely. */
export type CallIdInput = string | Uint8Array;

export interface PacketHeader {
  readonly type: number;
  readonly seq: number;
  readonly timestampMs: number;
  /** Canonical hyphenated UUID string. */
  readonly callId: string;
  readonly payloadLength: number;
}

export interface DecodedPacket extends PacketHeader {
  /** Zero-copy view into the source buffer. Do NOT retain past the slab lifetime. */
  readonly payload: Uint8Array;
}

export interface EncodeInput {
  readonly type: number;
  readonly seq: number;
  readonly timestampMs: number;
  readonly callId: CallIdInput;
  readonly payload: Uint8Array;
  readonly payloadOffset?: number;
  readonly payloadLength?: number;
}
