import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIdbPersister } from '../idbPersister';
import * as idbKeyval from 'idb-keyval';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

describe('idbPersister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    expect(idbKeyval.set).toHaveBeenCalledWith('test_key', mockClient);
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
