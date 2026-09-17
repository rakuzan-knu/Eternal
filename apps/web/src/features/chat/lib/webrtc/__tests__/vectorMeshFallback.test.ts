import { describe, it, expect } from 'vitest';
import {
  encodeVectorMeshFrame,
  decodeVectorMeshFrame,
  type NormalizedLandmark,
} from '../vectorMeshFallback';

describe('VectorMeshFallback', () => {
  it('encodes landmarks into compact binary buffer and decodes with high precision', () => {
    const input: NormalizedLandmark[] = [
      { x: 0.1234, y: 0.5678, z: -0.05 },
      { x: 0.9876, y: 0.3333, z: 0.12 },
      { x: 0.5, y: 0.5, z: 0.0 },
    ];

    const binary = encodeVectorMeshFrame(input);
    // 4 bytes header + 3 * 6 bytes = 22 bytes
    expect(binary.byteLength).toBe(22);

    const decoded = decodeVectorMeshFrame(binary);
    expect(decoded).toHaveLength(3);

    expect(decoded[0]!.x).toBeCloseTo(0.1234, 3);
    expect(decoded[0]!.y).toBeCloseTo(0.5678, 3);
    expect(decoded[0]!.z).toBeCloseTo(-0.05, 2);

    expect(decoded[1]!.x).toBeCloseTo(0.9876, 3);
    expect(decoded[2]!.x).toBeCloseTo(0.5, 3);
  });

  it('compresses 36-point facial mesh to under 250 bytes (<2.5 kbps @ 15fps)', () => {
    const landmarks: NormalizedLandmark[] = Array.from({ length: 36 }, (_, i) => ({
      x: (i * 0.02) % 1.0,
      y: (i * 0.03) % 1.0,
      z: 0.01 * (i % 5),
    }));

    const binary = encodeVectorMeshFrame(landmarks);
    // 4 + 36 * 6 = 220 bytes!
    expect(binary.byteLength).toBe(220);
    expect(binary.byteLength).toBeLessThan(250);

    // 220 bytes * 15 frames/sec * 8 bits = 26,400 bps = 26.4 kbps (well under 50 kbps)
    const bitrateBps = binary.byteLength * 15 * 8;
    expect(bitrateBps).toBeLessThan(50000);
  });

  it('safely handles corrupted or truncated buffers', () => {
    expect(decodeVectorMeshFrame(new Uint8Array([]))).toEqual([]);
    expect(decodeVectorMeshFrame(new Uint8Array([0x00, 0x00, 0x01]))).toEqual([]);
    expect(decodeVectorMeshFrame(new Uint8Array([0x56, 0x01, 10, 0]))).toEqual([]); // truncated
  });
});
