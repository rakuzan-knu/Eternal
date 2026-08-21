import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEditPostMutation } from '../useEditPostMutation';
import { postsApi } from '../../api/postsApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/postsApi', () => ({
  postsApi: {
    editPost: vi.fn(),
  },
}));

describe('useEditPostMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('updates post text and updates feed cache', async () => {
    vi.mocked(postsApi.editPost).mockResolvedValue({
      id: 'p1',
      text: 'new text',
    } as unknown as never);

    queryClient.setQueryData(['feed'], {
      pages: [{ posts: [{ id: 'p1', text: 'old text' }], nextCursor: null }],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useEditPostMutation('p1', ['feed']), { wrapper });

    result.current.mutate('new text');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postsApi.editPost).toHaveBeenCalledWith('p1', 'new text');
  });
});
