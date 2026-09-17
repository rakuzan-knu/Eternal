import { timingSafeEqual, timingSafeBufferEqual } from '../timing-safe';

describe('Timing Attack Protection (timingSafeEqual)', () => {
  it('returns true for identical strings', () => {
    const token = 'my-secret-jwt-token-xyz-12345';
    expect(timingSafeEqual(token, token)).toBe(true);
    expect(timingSafeEqual('exact_match', 'exact_match')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(timingSafeEqual('secret_token_1', 'secret_token_2')).toBe(false);
  });

  it('returns false for different strings of different lengths without throwing', () => {
    expect(timingSafeEqual('short', 'much_longer_secret_token_string')).toBe(false);
    expect(timingSafeEqual('much_longer_secret_token_string', 'short')).toBe(false);
    expect(timingSafeEqual('', 'token')).toBe(false);
  });

  it('handles null and undefined safely without throwing', () => {
    expect(timingSafeEqual(null, 'secret')).toBe(false);
    expect(timingSafeEqual('secret', undefined)).toBe(false);
    expect(timingSafeEqual(null, undefined)).toBe(false);
  });

  it('returns true for identical buffers', () => {
    const bufA = Buffer.from('webhook-hmac-sha256-signature');
    const bufB = Buffer.from('webhook-hmac-sha256-signature');
    expect(timingSafeEqual(bufA, bufB)).toBe(true);
  });

  it('returns false for different buffers', () => {
    const bufA = Buffer.from('signature-valid');
    const bufB = Buffer.from('signature-tamper');
    expect(timingSafeEqual(bufA, bufB)).toBe(false);
  });

  describe('timingSafeBufferEqual', () => {
    it('returns true for matching buffers', () => {
      const bufA = Buffer.from('abc123');
      const bufB = Buffer.from('abc123');
      expect(timingSafeBufferEqual(bufA, bufB)).toBe(true);
    });

    it('returns false for non-matching buffers of equal length', () => {
      const bufA = Buffer.from('abc123');
      const bufB = Buffer.from('xyz789');
      expect(timingSafeBufferEqual(bufA, bufB)).toBe(false);
    });

    it('returns false for buffers of different lengths without throwing', () => {
      const bufA = Buffer.from('abc');
      const bufB = Buffer.from('abcdef');
      expect(timingSafeBufferEqual(bufA, bufB)).toBe(false);
    });
  });
});
