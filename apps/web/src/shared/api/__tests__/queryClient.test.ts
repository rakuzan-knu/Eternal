import { describe, it, expect, vi } from 'vitest';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { persistQueryClientRestore } from '@tanstack/react-query-persist-client';
import { queryClient, offlinePersistOptions } from '../queryClient';

describe('queryClient', () => {
  it('initializes with expected default query options', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.retry).toBe(1);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });
  it('restores pending offline writes from an existing cache without discarding them', async () => {
    const original = new QueryClient();
    original.getMutationCache().build(
      original,
      { mutationKey: ['send'] },
      {
        status: 'pending',
        isPaused: true,
        submittedAt: Date.now(),
        variables: { text: 'Not sent yet' },
        context: undefined,
        data: undefined,
        error: null,
        failureCount: 0,
        failureReason: null,
      },
    );
    const saved = { timestamp: Date.now(), buster: 'v1.0.0', clientState: dehydrate(original) };
    const restored = new QueryClient();
    const removeClient = vi.fn();
    await persistQueryClientRestore({
      ...offlinePersistOptions,
      queryClient: restored,
      persister: { persistClient: vi.fn(), restoreClient: async () => saved, removeClient },
    });
    expect(removeClient).not.toHaveBeenCalled();
    expect(restored.getMutationCache().getAll()[0]?.state).toMatchObject({
      isPaused: true,
      variables: { text: 'Not sent yet' },
    });
    original.clear();
    restored.clear();
  });
});
