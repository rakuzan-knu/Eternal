/**
 * Enterprise Safe SessionStorage Wrapper
 *
 * Provides resilient, SSR-safe, tab-isolated storage with an in-memory fallback.
 * SessionStorage lives strictly for the duration of the browser tab and is never
 * shared across tabs or windows.
 *
 * Appropriate for:
 * - Ephemeral OAuth & PKCE state verifiers
 * - 2FA / Password reset intermediate challenge tokens
 * - Per-tab return URL redirect navigation targets
 * - Form wizard step caches that should not persist across sessions
 */

const memoryFallback = new Map<string, string>();

export function isSessionStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return false;
  }
  try {
    const testKey = '__test_session_storage__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function sessionStorageGet<T = string>(key: string, defaultValue?: T): T | null {
  try {
    if (isSessionStorageAvailable()) {
      const raw = window.sessionStorage.getItem(key);
      if (raw === null) return defaultValue ?? null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    }
  } catch {
    // ignore
  }

  const fallbackVal = memoryFallback.get(key);
  if (fallbackVal !== undefined) {
    try {
      return JSON.parse(fallbackVal) as T;
    } catch {
      return fallbackVal as unknown as T;
    }
  }

  return defaultValue ?? null;
}

export function sessionStorageSet<T>(key: string, value: T): void {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    if (isSessionStorageAvailable()) {
      window.sessionStorage.setItem(key, serialized);
      return;
    }
  } catch {
    // Quota exceeded or restricted context
  }
  memoryFallback.set(key, serialized);
}

export function sessionStorageRemove(key: string): void {
  try {
    if (isSessionStorageAvailable()) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  memoryFallback.delete(key);
}

export function sessionStorageClear(): void {
  try {
    if (isSessionStorageAvailable()) {
      window.sessionStorage.clear();
    }
  } catch {
    // ignore
  }
  memoryFallback.clear();
}

/* ========================================================================= */
/* Specialized Session Domain Helpers                                        */
/* ========================================================================= */

const OAUTH_KEY_PREFIX = 'oauth_session_';
const RETURN_URL_KEY = 'auth_return_url';
const TWO_FACTOR_KEY = 'auth_2fa_challenge';

export interface OAuthSessionData {
  state: string;
  verifier?: string;
  timestamp: number;
}

export interface TwoFactorChallengeData {
  tempToken: string;
  expiresAt: number;
  userId: string;
}

/**
 * Stores OAuth state and optional PKCE verifier for a specific platform.
 */
export function setOAuthSessionState(platform: string, state: string, verifier?: string): void {
  sessionStorageSet<OAuthSessionData>(`${OAUTH_KEY_PREFIX}${platform.toLowerCase()}`, {
    state,
    verifier,
    timestamp: Date.now(),
  });
}

/**
 * Retrieves OAuth session data for a specific platform.
 */
export function getOAuthSessionState(platform: string): OAuthSessionData | null {
  return sessionStorageGet<OAuthSessionData>(`${OAUTH_KEY_PREFIX}${platform.toLowerCase()}`);
}

/**
 * Clears OAuth session data for a specific platform.
 */
export function clearOAuthSessionState(platform: string): void {
  sessionStorageRemove(`${OAUTH_KEY_PREFIX}${platform.toLowerCase()}`);
}

/**
 * Sets post-authentication redirect URL for the current tab.
 */
export function setAuthReturnUrl(url: string): void {
  sessionStorageSet<string>(RETURN_URL_KEY, url);
}

/**
 * Gets post-authentication redirect URL for the current tab.
 */
export function getAuthReturnUrl(): string | null {
  return sessionStorageGet<string>(RETURN_URL_KEY);
}

/**
 * Clears post-authentication redirect URL for the current tab.
 */
export function clearAuthReturnUrl(): void {
  sessionStorageRemove(RETURN_URL_KEY);
}

/**
 * Stores temporary 2FA / OTP challenge session data.
 */
export function setTwoFactorChallenge(data: TwoFactorChallengeData): void {
  sessionStorageSet<TwoFactorChallengeData>(TWO_FACTOR_KEY, data);
}

/**
 * Retrieves temporary 2FA / OTP challenge session data if not expired.
 */
export function getTwoFactorChallenge(): TwoFactorChallengeData | null {
  const challenge = sessionStorageGet<TwoFactorChallengeData>(TWO_FACTOR_KEY);
  if (!challenge) return null;
  if (challenge.expiresAt && Date.now() > challenge.expiresAt) {
    clearTwoFactorChallenge();
    return null;
  }
  return challenge;
}

/**
 * Clears temporary 2FA / OTP challenge data.
 */
export function clearTwoFactorChallenge(): void {
  sessionStorageRemove(TWO_FACTOR_KEY);
}
