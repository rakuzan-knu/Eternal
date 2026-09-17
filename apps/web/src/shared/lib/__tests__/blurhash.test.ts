import { describe, expect, it, vi } from 'vitest';
import { decodeBlurHash } from '../blurhash';

describe('decodeBlurHash', () => {
  it('decodes a valid BlurHash string into an RGBA pixel array', () => {
    // Standard test BlurHash representing a gradient
    const sampleBlurHash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
    const width = 32;
    const height = 32;

    const pixels = decodeBlurHash(sampleBlurHash, width, height);

    expect(pixels).not.toBeNull();
    expect(pixels?.length).toBe(width * height * 4); // RGBA format
    // Alpha channel should be 255
    expect(pixels?.[3]).toBe(255);
  });

  it('returns null gracefully for invalid or empty BlurHash strings', () => {
    expect(decodeBlurHash('', 32, 32)).toBeNull();
    expect(decodeBlurHash('abc', 32, 32)).toBeNull();
  });

  it('handles unknown characters and malformed strings that throw in decode', () => {
    // String with invalid chars causing decode83 returning 0 or causing exceptions
    const malformed = 'L6@@@@@@@@@@@@@@@@@@@@@@@@@@@@';
    expect(decodeBlurHash(malformed, 4, 4)).not.toBeNull();

    // String with invalid size calculation causing out of bounds / null catch
    const invalidFlag = '~~PZfSi_'; // very large size flag that exceeds slice
    expect(decodeBlurHash(invalidFlag, 4, 4)).toBeNull();
  });

  it('returns null when Uint8ClampedArray creation throws (covers outer catch block lines 123-124)', () => {
    const OrigUint8ClampedArray = globalThis.Uint8ClampedArray;
    const MockArray = vi.fn().mockImplementation(() => {
      throw new RangeError('Invalid typed array length');
    });
    (globalThis as any).Uint8ClampedArray = MockArray;

    try {
      const result = decodeBlurHash('L6PZfSi_.AyE_3t7t7R**0o#DgR4', 32, 32);
      expect(result).toBeNull();
    } finally {
      (globalThis as any).Uint8ClampedArray = OrigUint8ClampedArray;
    }
  });
});
