import { describe, it, expect, vi } from 'vitest';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { persistQueryClientRestore } from '@tanstack/react-query-persist-client';
import { queryClient, offlinePersistOptions } from '../queryClient';

describe('queryClient', () => {
  it('initializes with expected default query options', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.retry).toBeTypeOf('function');
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

  it('retries a transient query failure once', () => {
    const retry = queryClient.getDefaultOptions().queries?.retry;
    if (typeof retry !== 'function') throw new Error('Expected a query retry policy');
    for (const error of [
      new Error('Network unavailable'),
      Object.assign(new Error('Server error'), { response: { status: 503 } }),
    ]) {
      expect(retry(0, error)).toBe(true);
      expect(retry(1, error)).toBe(false);
    }
  });

  it.each([401, 403, 404, 429])('does not retry HTTP %s client errors', (status) => {
    const retry = queryClient.getDefaultOptions().queries?.retry;
    if (typeof retry !== 'function') throw new Error('Expected a query retry policy');
    expect(retry(0, Object.assign(new Error('Client error'), { response: { status } }))).toBe(
      false,
    );
    expect(retry(0, Object.assign(new Error('Client error'), { status }))).toBe(false);
  });
});
