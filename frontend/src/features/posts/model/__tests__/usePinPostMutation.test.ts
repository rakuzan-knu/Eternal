import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePinPostMutation } from '../usePinPostMutation';
import { postsApi } from '../../api/postsApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/postsApi', () => ({
  postsApi: {
    pin: vi.fn(),
    unpin: vi.fn(),
  },
}));

describe('usePinPostMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('pins an unpinned post', async () => {
    vi.mocked(postsApi.pin).mockResolvedValue(undefined as never);

    queryClient.setQueryData(['feed'], {
      pages: [{ posts: [{ id: 'p1', isPinned: false }], nextCursor: null }],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => usePinPostMutation('p1', false, ['feed']), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postsApi.pin).toHaveBeenCalledWith('p1');
  });

  it('unpins an already pinned post', async () => {
    vi.mocked(postsApi.unpin).mockResolvedValue(undefined as never);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => usePinPostMutation('p1', true), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postsApi.unpin).toHaveBeenCalledWith('p1');
  });
});
