import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  isLocalStorageAvailable,
  localStorageClear,
  localStorageGet,
  localStorageRemove,
  localStorageSet,
} from '../safeLocalStorage';

describe('safeLocalStorage', () => {
  beforeEach(() => {
    localStorageClear();
    vi.restoreAllMocks();
  });

  it('correctly sets, gets, and removes values when localStorage is available', () => {
    expect(isLocalStorageAvailable()).toBe(true);

    localStorageSet('test-key', 'hello-world');
    expect(localStorageGet('test-key')).toBe('hello-world');

    localStorageSet('test-obj', { foo: 'bar', count: 42 });
    expect(localStorageGet<{ foo: string; count: number }>('test-obj')).toEqual({
      foo: 'bar',
      count: 42,
    });

    localStorageRemove('test-key');
    expect(localStorageGet('test-key')).toBeNull();
    expect(localStorageGet('test-key', 'default-val')).toBe('default-val');
  });

  it('falls back to in-memory store when window.localStorage throws QuotaExceededError', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    });

    localStorageSet('quota-key', 'memory-backed-value');
    expect(setItemSpy).toHaveBeenCalled();

    // Still retrieves from in-memory fallback successfully without throwing
    expect(localStorageGet('quota-key')).toBe('memory-backed-value');

    localStorageRemove('quota-key');
    expect(localStorageGet('quota-key')).toBeNull();
  });

  it('clears memory fallback on localStorageClear', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });

    localStorageSet('key1', 'val1');
    expect(localStorageGet('key1')).toBe('val1');

    localStorageClear();
    expect(localStorageGet('key1')).toBeNull();
  });
});
