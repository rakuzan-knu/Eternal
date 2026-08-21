import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCreatePost } from '../useCreatePost';
import { postsApi } from '../../api/postsApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/postsApi', () => ({
  postsApi: {
    createPost: vi.fn(),
  },
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'me', username: 'john', displayName: 'John' },
  }),
}));

describe('useCreatePost', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('submits form data and prepends optimistic post to feed cache', async () => {
    const mockCreatedPost = {
      id: 'p-real-1',
      author: { id: 'me', username: 'john' },
      text: 'Hello world',
    };
    vi.mocked(postsApi.createPost).mockResolvedValue(mockCreatedPost as unknown as never);

    queryClient.setQueryData(['feed'], {
      pages: [{ posts: [], nextCursor: null }],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCreatePost(['feed']), { wrapper });

    const fd = new FormData();
    fd.append('content', 'Hello world');
    result.current.mutate({ formData: fd });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postsApi.createPost).toHaveBeenCalledWith(fd);
  });
});
