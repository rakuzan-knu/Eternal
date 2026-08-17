import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLikeMutation } from '../useLikeMutation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useLikeMutation', () => {
  it('optimistically increments likes count on like', async () => {
    const queryClient = new QueryClient();
    const queryKey = ['posts-feed'];

    queryClient.setQueryData(queryKey, {
      pages: [
        {
          posts: [
            { id: 'post-1', isLiked: false, likes: 5 },
            { id: 'post-2', isLiked: true, likes: 10 },
          ],
        },
      ],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useLikeMutation('post-1', false, queryKey), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate();
    });

    const updatedData = queryClient.getQueryData<{
      pages: { posts: { id: string; isLiked: boolean; likes: number }[] }[];
    }>(queryKey);

    expect(updatedData?.pages[0].posts[0].isLiked).toBe(true);
    expect(updatedData?.pages[0].posts[0].likes).toBe(6);
  });
});
