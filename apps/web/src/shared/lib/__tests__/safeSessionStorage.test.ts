import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearAuthReturnUrl,
  clearOAuthSessionState,
  clearTwoFactorChallenge,
  getAuthReturnUrl,
  getOAuthSessionState,
  getTwoFactorChallenge,
  isSessionStorageAvailable,
  sessionStorageClear,
  sessionStorageGet,
  sessionStorageRemove,
  sessionStorageSet,
  setAuthReturnUrl,
  setOAuthSessionState,
  setTwoFactorChallenge,
} from '../safeSessionStorage';

describe('safeSessionStorage', () => {
  beforeEach(() => {
    sessionStorageClear();
  });

  it('detects session storage availability', () => {
    expect(isSessionStorageAvailable()).toBe(true);
  });

  it('sets and gets raw strings and objects', () => {
    sessionStorageSet('simple_key', 'hello-world');
    expect(sessionStorageGet('simple_key')).toBe('hello-world');

    sessionStorageSet('json_key', { a: 1, b: 'two' });
    expect(sessionStorageGet<{ a: number; b: string }>('json_key')).toEqual({ a: 1, b: 'two' });
  });

  it('returns default value when key does not exist', () => {
    expect(sessionStorageGet('missing_key', 'fallback')).toBe('fallback');
  });

  it('removes keys correctly', () => {
    sessionStorageSet('key_to_remove', 'val');
    sessionStorageRemove('key_to_remove');
    expect(sessionStorageGet('key_to_remove')).toBeNull();
  });

  it('handles OAuth session data storage and clearing', () => {
    setOAuthSessionState('github', 'random-state-123', 'code-verifier-456');
    const data = getOAuthSessionState('github');

    expect(data).toBeDefined();
    expect(data?.state).toBe('random-state-123');
    expect(data?.verifier).toBe('code-verifier-456');
    expect(typeof data?.timestamp).toBe('number');

    clearOAuthSessionState('github');
    expect(getOAuthSessionState('github')).toBeNull();
  });

  it('manages per-tab return redirect URLs', () => {
    setAuthReturnUrl('/settings/security');
    expect(getAuthReturnUrl()).toBe('/settings/security');

    clearAuthReturnUrl();
    expect(getAuthReturnUrl()).toBeNull();
  });

  it('handles 2FA challenge expiration', () => {
    const validChallenge = {
      tempToken: 'challenge-tok',
      expiresAt: Date.now() + 60000,
      userId: 'user-xyz',
    };
    setTwoFactorChallenge(validChallenge);
    expect(getTwoFactorChallenge()).toEqual(validChallenge);

    const expiredChallenge = {
      tempToken: 'expired-tok',
      expiresAt: Date.now() - 1000,
      userId: 'user-xyz',
    };
    setTwoFactorChallenge(expiredChallenge);
    expect(getTwoFactorChallenge()).toBeNull();

    clearTwoFactorChallenge();
    expect(getTwoFactorChallenge()).toBeNull();
  });
});
