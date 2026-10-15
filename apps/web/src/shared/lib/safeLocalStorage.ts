/**
 * Enterprise Safe LocalStorage Wrapper
 *
 * Provides resilient, SSR-safe, quota-handled storage with an in-memory fallback.
 * Prevents unhandled QuotaExceededError in restricted iframe contexts, strict
 * iOS Safari Private Browsing mode, or full storage quotas.
 */

const memoryFallback = new Map<string, string>();

export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const testKey = '__test_local_storage__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function localStorageGet<T = string>(key: string, defaultValue?: T): T | null {
  try {
    if (isLocalStorageAvailable()) {
      const raw = window.localStorage.getItem(key);
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

export function localStorageSet<T>(key: string, value: T): void {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.setItem(key, serialized);
      return;
    }
  } catch {
    // Quota exceeded or private browsing restricted context
  }
  memoryFallback.set(key, serialized);
}

export function localStorageRemove(key: string): void {
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  memoryFallback.delete(key);
}

export function localStorageClear(): void {
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.clear();
    }
  } catch {
    // ignore
  }
  memoryFallback.clear();
}
