import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { idbGet, idbSet, idbDelete, idbClear } from '../indexedDbStorage';

describe('indexedDbStorage', () => {
  let store: Map<string, any>;
  let mockDb: any;
  let mockIdb: any;
  const originalIndexedDB = window.indexedDB;

  beforeEach(() => {
    store = new Map();

    mockDb = {
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false),
      },
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockImplementation((_storeName: string, _mode: string) => {
        return {
          objectStore: vi.fn().mockImplementation(() => ({
            get: vi.fn().mockImplementation((key: string) => {
              const req: any = { result: store.get(key) };
              setTimeout(() => {
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            }),
            put: vi.fn().mockImplementation((val: any, key: string) => {
              store.set(key, val);
              const req: any = {};
              setTimeout(() => {
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            }),
            delete: vi.fn().mockImplementation((key: string) => {
              store.delete(key);
              const req: any = {};
              setTimeout(() => {
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            }),
            clear: vi.fn().mockImplementation(() => {
              store.clear();
              const req: any = {};
              setTimeout(() => {
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            }),
          })),
        };
      }),
    };

    mockIdb = {
      open: vi.fn().mockImplementation(() => {
        const req: any = { result: mockDb };
        setTimeout(() => {
          if (req.onupgradeneeded) {
            req.onupgradeneeded({ target: req });
          }
          if (req.onsuccess) {
            req.onsuccess();
          }
        }, 0);
        return req;
      }),
    };

    Object.defineProperty(window, 'indexedDB', {
      value: mockIdb,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'indexedDB', {
      value: originalIndexedDB,
      writable: true,
      configurable: true,
    });
  });

  it('sets and gets items', async () => {
    await idbSet('my-key', { theme: 'dark' });
    const val = await idbGet<{ theme: string }>('my-key');
    expect(val).toEqual({ theme: 'dark' });
  });

  it('deletes an item', async () => {
    await idbSet('to-del', '123');
    expect(await idbGet('to-del')).toBe('123');
    await idbDelete('to-del');
    expect(await idbGet('to-del')).toBeUndefined();
  });

  it('clears all items', async () => {
    await idbSet('k1', 'v1');
    await idbSet('k2', 'v2');
    await idbClear();
    expect(await idbGet('k1')).toBeUndefined();
    expect(await idbGet('k2')).toBeUndefined();
  });

  it('handles missing indexedDB environment', async () => {
    Object.defineProperty(window, 'indexedDB', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(await idbGet('key')).toBeUndefined();
    await expect(idbSet('key', 'val')).resolves.toBeUndefined();
    await expect(idbDelete('key')).resolves.toBeUndefined();
    await expect(idbClear()).resolves.toBeUndefined();
  });

  it('handles open request error', async () => {
    mockIdb.open = vi.fn().mockImplementation(() => {
      const req: any = {};
      setTimeout(() => {
        if (req.onerror) req.onerror();
      }, 0);
      return req;
    });

    expect(await idbGet('key')).toBeUndefined();
  });

  it('handles open request throwing exception', async () => {
    mockIdb.open = vi.fn().mockImplementation(() => {
      throw new Error('Crash');
    });

    expect(await idbGet('key')).toBeUndefined();
  });

  it('handles transaction get/put/delete/clear errors', async () => {
    mockDb.transaction = vi.fn().mockImplementation(() => ({
      objectStore: vi.fn().mockImplementation(() => ({
        get: vi.fn().mockImplementation(() => {
          const req: any = {};
          setTimeout(() => req.onerror && req.onerror(), 0);
          return req;
        }),
        put: vi.fn().mockImplementation(() => {
          const req: any = {};
          setTimeout(() => req.onerror && req.onerror(), 0);
          return req;
        }),
        delete: vi.fn().mockImplementation(() => {
          const req: any = {};
          setTimeout(() => req.onerror && req.onerror(), 0);
          return req;
        }),
        clear: vi.fn().mockImplementation(() => {
          const req: any = {};
          setTimeout(() => req.onerror && req.onerror(), 0);
          return req;
        }),
      })),
    }));

    expect(await idbGet('key')).toBeUndefined();
    await expect(idbSet('key', 'val')).resolves.toBeUndefined();
    await expect(idbDelete('key')).resolves.toBeUndefined();
    await expect(idbClear()).resolves.toBeUndefined();
  });

  it('handles transaction exceptions', async () => {
    mockDb.transaction = vi.fn().mockImplementation(() => {
      throw new Error('Transaction closed');
    });

    expect(await idbGet('key')).toBeUndefined();
    await expect(idbSet('key', 'val')).resolves.toBeUndefined();
    await expect(idbDelete('key')).resolves.toBeUndefined();
    await expect(idbClear()).resolves.toBeUndefined();
  });
});
