/**
 * Public surface of @social-network/native (msg-codec v1, Node.js adapter).
 *
 * Usage:
 *   import { getActiveCodec, getCodecInfo } from '@social-network/native';
 *   const codec = getActiveCodec(); // native when a verified prebuild exists, else TS
 *   const bytes = codec.encodeAlloc({ type, seq, timestampMs, callId, payload });
 *
 * The portable TS core (@social-network/msg-codec) is always available and is
 * the default backend. The native binding is opportunistic: loaded once per
 * process, cross-checked against the core, silently ignored when absent or
 * disagreeing (unless MSG_CODEC=native, which fails fast instead).
 *
 * For web / React Native / Electron renderer use @social-network/msg-codec
 * directly — this package is Node-only (Buffer, process.env, require).
 */

import {
  decodeHeader as bufferDecodeHeader,
  decodePacket as bufferDecodePacket,
  encodeAlloc as bufferEncodeAlloc,
  encodeInto as bufferEncodeInto,
  type BufferDecodedPacket,
} from './buffer';
import { MsgCodecError } from '@social-network/msg-codec';
import {
  backendNameOf,
  createNativeFacade,
  parseSelection,
  tryLoadNative,
  type NativeBinding,
} from './native-bindings';
import {
  createCodecMetrics,
  recordDecode,
  recordEncode,
  recordError,
  recordHeaderOnly,
  resetMetrics,
  snapshotMetrics,
  type CodecMetrics,
} from './metrics';
import { MSG_CODEC_VERSION } from '@social-network/msg-codec';
import type { CodecInfo, EncodeInput, PacketHeader } from './types';

export { MsgCodecError } from '@social-network/msg-codec';
export type { MsgCodecErrorCode } from '@social-network/msg-codec';
export type {
  CallIdInput,
  CodecBackendName,
  CodecInfo,
  CodecMetricsSnapshot,
  DecodedPacket,
  EncodeInput,
  PacketHeader,
} from './types';
export type { BufferDecodedPacket } from './buffer';
export type { NativeBinding, NativeDecodedHeader, NativeDecodedPacket } from './native-bindings';
export {
  CALL_ID_BYTES,
  CANONICAL_UUID_CHARS,
  HEADER_SIZE_BYTES,
  MAX_PACKET_TYPE,
  MAX_PAYLOAD_BYTES,
  MAX_SEQ,
  MAX_TIMESTAMP_MS,
  MSG_CODEC_VERSION,
  OFFSET_CALL_ID,
  OFFSET_MAGIC,
  OFFSET_PAYLOAD_LEN,
  OFFSET_SEQ,
  OFFSET_TIMESTAMP,
  OFFSET_TYPE,
  PACKET_MAGIC_0,
  PACKET_MAGIC_1,
} from '@social-network/msg-codec';
export {
  formatUuid,
  packetTotalLength,
  parseUuidInto,
  writeCallIdInto,
} from '@social-network/msg-codec';
export { decodeHeader, decodePacket, encodeAlloc, encodeInto } from './buffer';
export { parseSelection, tryLoadNative } from './native-bindings';

export interface ActiveCodec {
  readonly backend: 'ts' | 'native';
  encodeInto(dst: Buffer, dstOffset: number, input: EncodeInput): number;
  encodeAlloc(input: EncodeInput): Buffer;
  decodeHeader(src: Buffer, offset?: number): PacketHeader;
  decodePacket(src: Buffer, offset?: number, end?: number): BufferDecodedPacket;
}

let cachedBinding: NativeBinding | null | undefined;
let cachedMetrics: CodecMetrics | undefined;

function metrics(): CodecMetrics {
  if (cachedMetrics === undefined) cachedMetrics = createCodecMetrics();
  return cachedMetrics;
}

function countedTsCodec(): ActiveCodec {
  const m = metrics();
  return {
    backend: 'ts',
    encodeInto(dst, dstOffset, input) {
      try {
        const end = bufferEncodeInto(dst, dstOffset, input);
        recordEncode(m, end - dstOffset);
        return end;
      } catch (err) {
        if (MsgCodecError.isMsgCodecError(err)) recordError(m, err.code);
        throw err;
      }
    },
    encodeAlloc(input) {
      try {
        const out = bufferEncodeAlloc(input);
        recordEncode(m, out.length);
        return out;
      } catch (err) {
        if (MsgCodecError.isMsgCodecError(err)) recordError(m, err.code);
        throw err;
      }
    },
    decodeHeader(src, offset) {
      try {
        const header = bufferDecodeHeader(src, offset ?? 0);
        recordHeaderOnly(m);
        return header;
      } catch (err) {
        if (MsgCodecError.isMsgCodecError(err)) recordError(m, err.code);
        throw err;
      }
    },
    decodePacket(src, offset, end) {
      try {
        const packet = bufferDecodePacket(src, offset ?? 0, end);
        recordDecode(m, packet.payloadLength + 36);
        return packet;
      } catch (err) {
        if (MsgCodecError.isMsgCodecError(err)) recordError(m, err.code);
        throw err;
      }
    },
  };
}

function countedNativeCodec(binding: NativeBinding): ActiveCodec {
  const facade = createNativeFacade(binding);
  const m = metrics();
  return {
    backend: 'native',
    encodeInto(dst, dstOffset, input) {
      try {
        const end = facade.encodeInto(dst, dstOffset, input);
        recordEncode(m, end - dstOffset);
        return end;
      } catch (err) {
        if (MsgCodecError.isMsgCodecError(err)) recordError(m, err.code);
        throw err;
      }
    },
    encodeAlloc(input) {
      try {
        const out = facade.encodeAlloc(input);
        recordEncode(m, out.length);
        return out;
      } catch (err) {
        if (MsgCodecError.isMsgCodecError(err)) recordError(m, err.code);
        throw err;
      }
    },
    decodeHeader(src, offset) {
      try {
        const header = facade.decodeHeader(src, offset);
        recordHeaderOnly(m);
        return header;
      } catch (err) {
        if (MsgCodecError.isMsgCodecError(err)) recordError(m, err.code);
        throw err;
      }
    },
    decodePacket(src, offset, end) {
      try {
        const packet = facade.decodePacket(src, offset, end);
        recordDecode(m, packet.payloadLength + 36);
        return packet;
      } catch (err) {
        if (MsgCodecError.isMsgCodecError(err)) recordError(m, err.code);
        throw err;
      }
    },
  };
}

let cachedCodec: ActiveCodec | undefined;

/**
 * Process-wide codec singleton. First call resolves the backend
 * (MSG_CODEC=auto|ts|native); later calls reuse it. The metrics object
 * is shared across the process — snapshot via getCodecMetrics().
 */
export function getActiveCodec(): ActiveCodec {
  if (cachedCodec !== undefined) return cachedCodec;
  if (cachedBinding === undefined) {
    cachedBinding = parseSelection() === 'ts' ? null : tryLoadNative();
  }
  cachedCodec = cachedBinding !== null ? countedNativeCodec(cachedBinding) : countedTsCodec();
  return cachedCodec;
}

export function getCodecInfo(): CodecInfo {
  if (cachedBinding === undefined) {
    cachedBinding = parseSelection() === 'ts' ? null : tryLoadNative();
  }
  const backend = backendNameOf(cachedBinding);
  return {
    name: '@social-network/native',
    protocolVersion: MSG_CODEC_VERSION,
    backend,
    nativeLoaded: cachedBinding !== null,
    nativeSelfTest: cachedBinding !== null,
  };
}

export function getCodecMetrics() {
  return snapshotMetrics(metrics());
}

export function resetCodecMetrics(): void {
  resetMetrics(metrics());
}

/** Test-only: drops cached backend/binding so MSG_CODEC can be re-evaluated. */
export function __resetActiveCodecForTests(): void {
  cachedCodec = undefined;
  cachedBinding = undefined;
  cachedMetrics = undefined;
}

export type {
  AcceleratorSelection,
  BlindedCryptoBinding,
  FeedScoreBinding,
  TextPipelineBinding,
} from './accelerators';
export { tryLoadBlindedCrypto, tryLoadFeedScore, tryLoadTextPipeline } from './accelerators';
