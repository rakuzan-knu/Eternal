import { describe, expect, it } from 'vitest';
import { redactRequestUrl } from './redact-url.util';

describe('redactRequestUrl', () => {
  it('redacts community invite credentials in preview and acceptance paths', () => {
    expect(redactRequestUrl('/v1/messenger/communities/invites/secret-token/accept')).toBe(
      '/v1/messenger/communities/invites/[REDACTED]/accept',
    );
    expect(
      redactRequestUrl('/api/messenger/communities/invites/secret-token?q=test'),
    ).not.toContain('secret-token');
  });
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
