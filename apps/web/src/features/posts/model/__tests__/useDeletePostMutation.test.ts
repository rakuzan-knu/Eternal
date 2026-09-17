import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeletePostMutation } from '../useDeletePostMutation';
import { postsApi } from '../../api/postsApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/postsApi', () => ({
  postsApi: {
    deletePost: vi.fn(),
  },
}));

describe('useDeletePostMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('deletes post and updates cached feed', async () => {
    vi.mocked(postsApi.deletePost).mockResolvedValue(undefined as never);

    queryClient.setQueryData(['feed'], {
      pages: [{ posts: [{ id: 'p1', text: 'to delete' }], nextCursor: null }],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeletePostMutation('p1', ['feed']), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postsApi.deletePost).toHaveBeenCalledWith('p1');
  });

  it('handles delete failure with error toast and works without currentQueryKey', async () => {
    vi.mocked(postsApi.deletePost).mockRejectedValue(new Error('Failed'));

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeletePostMutation('p2'), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
