import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePostsFeed } from '../usePostsFeed';
import { postsApi } from '../../api/postsApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/postsApi', () => ({
  postsApi: {
    getFeed: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('usePostsFeed', () => {
  it('fetches posts feed using infinite query', async () => {
    vi.mocked(postsApi.getFeed).mockResolvedValue({
      posts: [],
      nextCursor: 'cursor-2',
    });

    const { result } = renderHook(() => usePostsFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual({
      posts: [],
      nextCursor: 'cursor-2',
    });
  });
});
