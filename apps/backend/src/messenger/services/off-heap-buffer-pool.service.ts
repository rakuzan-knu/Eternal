/**
 * Off-Heap Buffers & Zero-GC Memory Architecture (Node.js)
 *
 * Owns a pre-allocated unmanaged slab outside the V8 managed heap via
 * Buffer.allocUnsafeSlow(). Packet framing itself is delegated to
 * @social-network/native (msg-codec v1) — table-driven codec, byte-identical
 * to the previous inline DataView implementation, ~2.5-3.6x faster per
 * packet (see packages/native/benches/report.json).
 *
 * Memory semantics (unchanged, read carefully):
 *  - encodePacket() returns a VIEW into the shared slab. The bytes are
 *    overwritten on ring wrap. Copy (Buffer.from / encodeAlloc) if you need
 *    ownership past the next allocations.
 *  - decodePacket() payload is a zero-copy view into the caller's buffer.
 */

import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import {
  getActiveCodec,
  getCodecInfo,
  getCodecMetrics,
  HEADER_SIZE_BYTES as CODEC_HEADER_SIZE,
  PACKET_MAGIC_0 as CODEC_MAGIC_0,
  PACKET_MAGIC_1 as CODEC_MAGIC_1,
  type ActiveCodec,
  type CodecInfo,
  type CodecMetricsSnapshot,
  type PacketHeader,
} from '@social-network/native';

export const OFF_HEAP_DEFAULT_SLAB_SIZE = 32 * 1024 * 1024; // 32 Megabytes off-heap
/** Re-exported from msg-codec v1: single source of truth lives in packages/native. */
export const PACKET_MAGIC_0 = CODEC_MAGIC_0;
export const PACKET_MAGIC_1 = CODEC_MAGIC_1;
export const HEADER_SIZE_BYTES = CODEC_HEADER_SIZE;

export interface BinaryPacketHeader {
  type: number;
  seq: number;
  timestamp: number;
  callId: string;
  payloadLength: number;
}

export interface DecodedBinaryPacket extends BinaryPacketHeader {
  payload: Buffer;
}

export interface OffHeapPoolStats {
  capacityBytes: number;
  currentOffset: number;
  wrapCount: number;
  allocationsCount: number;
}

export interface OffHeapExtendedStats extends OffHeapPoolStats {
  codec: CodecInfo;
  codecMetrics: CodecMetricsSnapshot;
}

@Injectable()
export class OffHeapBufferPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(OffHeapBufferPoolService.name);
  private readonly slab: Buffer;
  private readonly capacity: number;
  private readonly codec: ActiveCodec;

  private currentOffset = 0;
  private wrapCount = 0;
  private allocationsCount = 0;

  constructor(@Optional() @Inject('OFF_HEAP_SLAB_SIZE') capacity?: number) {
    this.capacity = capacity ?? OFF_HEAP_DEFAULT_SLAB_SIZE;
    // Buffer.allocUnsafeSlow bypasses Node.js 8KB internal slab and V8 managed nursery heap
    this.slab = Buffer.allocUnsafeSlow(this.capacity);
    // Resolves once per process: native prebuild when verified, else TS fallback.
    // MSG_CODEC=native fails fast here when no binary is available (explicit opt-in only).
    this.codec = getActiveCodec();
    const info = getCodecInfo();
    this.logger.log(
      `Initialized Off-Heap Zero-GC Slab Pool (${Math.round(this.capacity / (1024 * 1024))} MB, msg-codec v1/${info.backend})`,
    );
  }

  /**
   * Allocates a contiguous off-heap slice aligned to 4-byte boundaries.
   */
  public allocate(sizeBytes: number): Buffer {
    if (sizeBytes > this.capacity) {
      throw new Error(
        `Requested off-heap size ${sizeBytes} exceeds total slab capacity ${this.capacity}`,
      );
    }

    // Align to 4-byte boundary
    const alignedOffset = (this.currentOffset + 3) & ~3;

    if (alignedOffset + sizeBytes > this.capacity) {
      this.currentOffset = 0;
      this.wrapCount++;
    } else {
      this.currentOffset = alignedOffset;
    }

    const start = this.currentOffset;
    this.currentOffset += sizeBytes;
    this.allocationsCount++;

    return this.slab.subarray(start, start + sizeBytes);
  }

  /**
   * Encodes a high-frequency real-time packet into off-heap memory.
   * Returns a VIEW into the slab (see memory semantics above).
   */
  public encodePacket(
    type: number,
    seq: number,
    callIdUuid: string,
    payload: Buffer | Uint8Array,
  ): Buffer {
    const payloadLen = payload.byteLength;
    const packetBuffer = this.allocate(HEADER_SIZE_BYTES + payloadLen);
    this.codec.encodeInto(packetBuffer, 0, {
      type,
      seq,
      timestampMs: Date.now(),
      callId: callIdUuid,
      payload,
    });
    return packetBuffer;
  }

  /**
   * Stateless encode for callers that need ownership: allocates an exact-size
   * Buffer outside the slab (GC-managed, safe to retain).
   */
  public encodeAlloc(
    type: number,
    seq: number,
    callIdUuid: string,
    payload: Buffer | Uint8Array,
  ): Buffer {
    return this.codec.encodeAlloc({
      type,
      seq,
      timestampMs: Date.now(),
      callId: callIdUuid,
      payload,
    });
  }

  /**
   * Decodes a binary packet with zero-copy sub-slicing.
   * Throws MsgCodecError (codes INVALID_MAGIC/TRUNCATED/...) on corruption
   * instead of generic Errors — safe to switch on err.code at call sites.
   */
  public decodePacket(packetBuffer: Buffer): DecodedBinaryPacket {
    const decoded = this.codec.decodePacket(packetBuffer, 0);
    return {
      type: decoded.type,
      seq: decoded.seq,
      timestamp: decoded.timestampMs,
      callId: decoded.callId,
      payloadLength: decoded.payloadLength,
      payload: decoded.payload,
    };
  }

  /**
   * Header-only parse for routing/filtering without touching the payload.
   * Touches exactly 36 bytes — use on fan-out paths before deciding to
   * decode or forward.
   */
  public decodeHeader(packetBuffer: Buffer, offset = 0): PacketHeader {
    return this.codec.decodeHeader(packetBuffer, offset);
  }

  public getCodecInfo(): CodecInfo {
    return getCodecInfo();
  }

  public getStats(): OffHeapPoolStats {
    return {
      capacityBytes: this.capacity,
      currentOffset: this.currentOffset,
      wrapCount: this.wrapCount,
      allocationsCount: this.allocationsCount,
    };
  }

  public getExtendedStats(): OffHeapExtendedStats {
    return {
      ...this.getStats(),
      codec: getCodecInfo(),
      codecMetrics: getCodecMetrics(),
    };
  }

  onModuleDestroy(): void {
    this.currentOffset = 0;
  }
}
