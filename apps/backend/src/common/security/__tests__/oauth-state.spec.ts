import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptOAuthState, encryptOAuthState } from '../oauth-state';

beforeEach(() => {
  for (const name of ['COOKIE_ENCRYPTION_KEY', 'SESSION_SECRET', 'JWT_SECRET', 'JWT_ACCESS_SECRET'])
    vi.stubEnv(name, '');
});

afterEach(() => vi.unstubAllEnvs());

describe('OAuth cookie encryption configuration', () => {
  it('uses the validated JWT_ACCESS_SECRET when no dedicated key is configured', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_ACCESS_SECRET', 'test-access-secret');
    const encrypted = encryptOAuthState('state');
    expect(decryptOAuthState(encrypted)).toBe('state');
    vi.stubEnv('JWT_ACCESS_SECRET', 'different-test-access-secret');
    expect(decryptOAuthState(encrypted)).toBeNull();
  });

  it('preserves the priority of existing dedicated encryption keys', () => {
    vi.stubEnv('COOKIE_ENCRYPTION_KEY', 'test-cookie-secret');
    const encrypted = encryptOAuthState('state');
    vi.stubEnv('JWT_ACCESS_SECRET', 'test-access-secret');
    expect(decryptOAuthState(encrypted)).toBe('state');
  });

  it('fails closed in production instead of using a public fallback key', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => encryptOAuthState('state')).toThrow('configured secret');
  });
});
