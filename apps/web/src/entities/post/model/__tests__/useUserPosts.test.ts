import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserPosts } from '../useUserPosts';
import { postsApi } from '../../api/postsApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/postsApi', () => ({
  postsApi: {
    getUserPosts: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useUserPosts', () => {
  it('fetches user posts using infinite query', async () => {
    vi.mocked(postsApi.getUserPosts).mockResolvedValue({
      posts: [],
      nextCursor: null,
    });

    const { result } = renderHook(() => useUserPosts('user1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual({
      posts: [],
      nextCursor: null,
    });
  });
});
