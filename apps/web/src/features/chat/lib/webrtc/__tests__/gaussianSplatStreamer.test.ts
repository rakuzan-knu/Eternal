import { describe, it, expect } from 'vitest';
import {
  quantizeGaussianSplats,
  dequantizeGaussianSplats,
  generateVolumetricAvatar,
  BYTES_PER_SPLAT,
  SPLAT_MAGIC,
  GaussianSplat3D,
} from '../gaussianSplatStreamer';

describe('gaussianSplatStreamer', () => {
  it('quantizes and dequantizes 3D Gaussian Splats with 16-byte fixed stride', () => {
    const originalSplats: GaussianSplat3D[] = [
      {
        x: 150,
        y: -300,
        z: 450,
        scaleX: 20,
        scaleY: 22,
        scaleZ: 18,
        rotation: [0, 0, 0, 1],
        r: 240,
        g: 180,
        b: 140,
        alpha: 255,
      },
      {
        x: -500,
        y: 120,
        z: -800,
        scaleX: 10,
        scaleY: 10,
        scaleZ: 10,
        rotation: [0, 0.707, 0, 0.707],
        r: 50,
        g: 100,
        b: 200,
        alpha: 200,
      },
    ];

    const buffer = quantizeGaussianSplats(originalSplats);

    // Buffer length must be 4 bytes header + 2 * 16 bytes = 36 bytes
    expect(buffer.byteLength).toBe(4 + 2 * BYTES_PER_SPLAT);
    const view = new DataView(buffer.buffer);
    expect(view.getUint16(0)).toBe(SPLAT_MAGIC);

    const dequantized = dequantizeGaussianSplats(buffer);
    expect(dequantized.length).toBe(2);

    // Verify precision within integer quantization range
    expect(dequantized[0].x).toBe(150);
    expect(dequantized[0].y).toBe(-300);
    expect(dequantized[0].z).toBe(450);
    expect(dequantized[0].scaleX).toBe(20);
    expect(dequantized[0].r).toBe(240);
    expect(dequantized[0].g).toBe(180);
    expect(dequantized[0].b).toBe(140);
    expect(dequantized[0].alpha).toBe(255);

    expect(dequantized[1].x).toBe(-500);
    expect(dequantized[1].y).toBe(120);
    expect(dequantized[1].z).toBe(-800);
  });

  it('generates 1200 volumetric avatar splats fitting in ~20 KB', () => {
    const splats = generateVolumetricAvatar(0, 1200);
    expect(splats.length).toBe(1200);

    const binary = quantizeGaussianSplats(splats);
    // 4 + 1200 * 16 = 19204 bytes (~18.75 KB)
    expect(binary.byteLength).toBe(19204);
    expect(binary.byteLength).toBeLessThan(25000); // Fits easily in single DataChannel frame
  });

  it('rejects corrupted or truncated binary streams', () => {
    expect(dequantizeGaussianSplats(new Uint8Array(2))).toEqual([]);

    const badMagic = new Uint8Array(20);
    badMagic[0] = 0x00;
    expect(dequantizeGaussianSplats(badMagic)).toEqual([]);
  });
});
