import { describe, expect, it } from 'vitest';
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
});
