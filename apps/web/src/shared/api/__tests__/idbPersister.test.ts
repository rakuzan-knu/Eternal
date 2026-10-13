import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createIdbPersister, idbPersister, DEFAULT_IDB_CACHE_KEY } from '../idbPersister';
import { resetSessionStores } from '@/shared/model/resetSession';
import * as idbKeyval from 'idb-keyval';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

describe('idbPersister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('persists client state to IndexedDB via idb-keyval', async () => {
    const persister = createIdbPersister('test_key');
    const mockClient: PersistedClient = {
      timestamp: Date.now(),
      buster: 'v1',
      clientState: {
        mutations: [],
        queries: [],
      },
    };

    await persister.persistClient(mockClient);
    await vi.advanceTimersByTimeAsync(1000);
    expect(idbKeyval.set).toHaveBeenCalledWith('test_key', mockClient);
  });

  it('coalesces 100 updates into the latest snapshot instead of queueing 100 IDB clones', async () => {
    const persister = createIdbPersister('burst');
    for (let timestamp = 0; timestamp < 100; timestamp++) {
      persister.persistClient({
        timestamp,
        buster: 'v1',
        clientState: { mutations: [], queries: [] },
      });
    }
    await vi.advanceTimersByTimeAsync(1000);
    expect(idbKeyval.set).toHaveBeenCalledTimes(1);
    expect(idbKeyval.set).toHaveBeenCalledWith('burst', expect.objectContaining({ timestamp: 99 }));
  });

  it('does not resurrect an offline session after removeClient cancels a queued write', async () => {
    const persister = createIdbPersister('removed');
    persister.persistClient({
      timestamp: 1,
      buster: 'v1',
      clientState: { mutations: [], queries: [] },
    });
    await persister.removeClient();
    await vi.advanceTimersByTimeAsync(2000);
    expect(idbKeyval.set).not.toHaveBeenCalled();
    expect(idbKeyval.del).toHaveBeenCalledWith('removed');
  });
  it('cancels the actual shared persister when the application resets a session', async () => {
    idbPersister.persistClient({
      timestamp: Date.now(),
      buster: 'v1.0.0',
      clientState: { mutations: [], queries: [] },
    });
    resetSessionStores();
    await vi.advanceTimersByTimeAsync(2000);
    expect(idbKeyval.set).not.toHaveBeenCalled();
    expect(idbKeyval.del).toHaveBeenCalledWith(DEFAULT_IDB_CACHE_KEY);
  });

  it('serializes slow transactions and keeps only the latest pending snapshot', async () => {
    let finish!: () => void;
    vi.mocked(idbKeyval.set).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const persister = createIdbPersister('slow');
    persister.persistClient({
      timestamp: 1,
      buster: 'v1',
      clientState: { mutations: [], queries: [] },
    });
    await vi.advanceTimersByTimeAsync(1000);
    for (let timestamp = 2; timestamp < 100; timestamp++)
      persister.persistClient({
        timestamp,
        buster: 'v1',
        clientState: { mutations: [], queries: [] },
      });
    await vi.advanceTimersByTimeAsync(5000);
    expect(idbKeyval.set).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(1000);
    expect(idbKeyval.set).toHaveBeenCalledTimes(2);
    expect(idbKeyval.set).toHaveBeenLastCalledWith(
      'slow',
      expect.objectContaining({ timestamp: 99 }),
    );
  });

  it('waits for an in-flight write before removing it on logout', async () => {
    let finish!: () => void;
    vi.mocked(idbKeyval.set).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const persister = createIdbPersister('logout');
    persister.persistClient({
      timestamp: 1,
      buster: 'v1',
      clientState: { mutations: [], queries: [] },
    });
    await vi.advanceTimersByTimeAsync(1000);
    const removed = persister.removeClient();
    expect(idbKeyval.del).not.toHaveBeenCalled();
    finish();
    await removed;
    await vi.advanceTimersByTimeAsync(2000);
    expect(idbKeyval.del).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restores client state from IndexedDB', async () => {
    const persister = createIdbPersister('test_key');
    const mockClient: PersistedClient = {
      timestamp: Date.now(),
      buster: 'v1',
      clientState: {
        mutations: [],
        queries: [],
      },
    };
    vi.mocked(idbKeyval.get).mockResolvedValueOnce(mockClient);

    const restored = await persister.restoreClient();
    expect(idbKeyval.get).toHaveBeenCalledWith('test_key');
    expect(restored).toEqual(mockClient);
  });

  it('removes client state from IndexedDB', async () => {
    const persister = createIdbPersister('test_key');
    await persister.removeClient();
    expect(idbKeyval.del).toHaveBeenCalledWith('test_key');
  });

  it('gracefully handles errors without throwing', async () => {
    const persister = createIdbPersister('test_key');
    vi.mocked(idbKeyval.get).mockRejectedValueOnce(new Error('QuotaExceeded'));
    const result = await persister.restoreClient();
    expect(result).toBeUndefined();
  });
});
