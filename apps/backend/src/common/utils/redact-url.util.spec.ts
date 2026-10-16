import { describe, expect, it } from 'vitest';
import { redactRequestUrl } from './redact-url.util';

describe('redactRequestUrl', () => {
  it('removes assertions, repeated and encoded credentials, and fragments', () => {
    const result = redactRequestUrl(
      '/callback?%73tate=secret&state=again&openid.sig=signed&code=auth&page=2#ticket',
    );
    expect(result).not.toMatch(/secret|again|signed|auth|ticket/);
    expect(new URL(result, 'https://example.test').searchParams.getAll('state')).toEqual([
      '[REDACTED]',
      '[REDACTED]',
    ]);
    expect(result).toContain('page=2');
  });
  it('redacts signed S3 parameters and preserves paths', () => {
    expect(redactRequestUrl('https://bucket.test/key?X-Amz-Signature=secret')).not.toContain(
      'secret',
    );
    expect(redactRequestUrl('/launch#secret')).toBe('/launch');
    expect(redactRequestUrl('/feed')).toBe('/feed');
  });
});
