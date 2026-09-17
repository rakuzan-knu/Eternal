/**
 * OffHeapBufferPoolService spec: slab semantics preserved, framing delegated
 * to @social-network/native (msg-codec v1).
 *
 * Covers: roundtrip incl. 0/empty payloads, byte-level wire compat with the
 * previous inline encoding, header-only fast path, slab wrap/ownership
 * semantics, typed errors, and codec observability surface.
 */

import { MsgCodecError } from '@social-network/native';
import { HEADER_SIZE_BYTES, OffHeapBufferPoolService } from '../off-heap-buffer-pool.service';

const UUID_A = '123e4567-e89b-12d3-a456-426614174000';
const UUID_B = '550e8400-e29b-41d4-a716-446655440000';

describe('OffHeapBufferPoolService (msg-codec v1)', () => {
  let service: OffHeapBufferPoolService;

  beforeEach(() => {
    service = new OffHeapBufferPoolService(64 * 1024);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('roundtrips packets with identical public shape', () => {
    const payload = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const encoded = service.encodePacket(7, 424242, UUID_A, payload);
    expect(encoded.byteLength).toBe(HEADER_SIZE_BYTES + payload.byteLength);

    const decoded = service.decodePacket(encoded);
    expect(decoded.type).toBe(7);
    expect(decoded.seq).toBe(424242);
    expect(decoded.callId).toBe(UUID_A);
    expect(decoded.payloadLength).toBe(payload.byteLength);
    expect(Buffer.compare(decoded.payload, payload)).toBe(0);
    expect(typeof decoded.timestamp).toBe('number');
  });

  it('keeps the frozen 36-byte wire layout', () => {
    const encoded = service.encodePacket(0x0102, 0x03040506, UUID_A, Buffer.from([0x0e]));
    expect(encoded[0]).toBe(0x45);
    expect(encoded[1]).toBe(0x54);
    expect(encoded.readUInt16BE(2)).toBe(0x0102);
    expect(encoded.readUInt32BE(4)).toBe(0x03040506);
    expect(encoded.subarray(16, 32).toString('hex')).toBe(UUID_A.replace(/-/g, ''));
    expect(encoded.readUInt32BE(32)).toBe(1);
  });

  it('supports empty payloads and header-only parsing', () => {
    const encoded = service.encodePacket(1, 1, UUID_B, Buffer.alloc(0));
    expect(encoded.byteLength).toBe(HEADER_SIZE_BYTES);
    const header = service.decodeHeader(encoded);
    expect(header.type).toBe(1);
    expect(header.callId).toBe(UUID_B);
    expect(header.payloadLength).toBe(0);
    expect(service.decodePacket(encoded).payload.byteLength).toBe(0);
  });

  it('rings the slab and documents view-aliasing semantics', () => {
    const tiny = new OffHeapBufferPoolService(128);
    try {
      const first = tiny.encodePacket(1, 1, UUID_A, Buffer.alloc(16));
      const firstBytes = Buffer.from(first); // snapshot: slab views alias memory
      // Force wrap with an allocation that no longer fits.
      tiny.allocate(64);
      const second = tiny.encodePacket(2, 2, UUID_B, Buffer.alloc(16));
      expect(tiny.decodePacket(second).callId).toBe(UUID_B);
      // The pre-wrap view still decodes structurally (same layout); its bytes
      // may have been recycled — callers needing ownership must copy.
      expect(firstBytes.byteLength).toBe(HEADER_SIZE_BYTES + 16);
      expect(tiny.getStats().wrapCount).toBeGreaterThanOrEqual(1);
    } finally {
      tiny.onModuleDestroy();
    }
  });

  it('encodeAlloc returns an owned buffer independent of the slab', () => {
    const owned = service.encodeAlloc(3, 3, UUID_A, Buffer.from([9, 9]));
    // Exhaust/recycle the slab; the owned copy must survive intact.
    for (let i = 0; i < 200; i++) {
      service.encodePacket(9, i, UUID_B, Buffer.alloc(64));
    }
    const decoded = service.decodePacket(owned);
    expect(decoded.callId).toBe(UUID_A);
    expect(Buffer.compare(decoded.payload, Buffer.from([9, 9]))).toBe(0);
  });

  it('throws typed MsgCodecError on corruption', () => {
    expect(() => service.decodePacket(Buffer.alloc(10))).toThrow(MsgCodecError);
    try {
      service.decodePacket(Buffer.alloc(10));
      throw new Error('unreachable');
    } catch (err) {
      expect((err as MsgCodecError).code).toBe('TRUNCATED');
    }
    const badMagic = Buffer.alloc(HEADER_SIZE_BYTES);
    expect(() => service.decodePacket(badMagic)).toThrow('INVALID_MAGIC');
  });

  it('rejects oversized allocations and exposes codec observability', () => {
    expect(() => service.allocate(64 * 1024 + 1)).toThrow();
    const info = service.getCodecInfo();
    expect(info.protocolVersion).toBe(1);
    expect(['ts', 'native']).toContain(info.backend);
    const stats = service.getExtendedStats();
    expect(stats.capacityBytes).toBe(64 * 1024);
    expect(stats.codecMetrics.encodeCalls).toBeGreaterThanOrEqual(1);
  });
});
