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

  it('optimistically updates compact feed with .data array and .viewer/.stats objects', async () => {
    const queryClient = new QueryClient();
    const compactKey = ['feed', 'compact', 'latest'];

    queryClient.setQueryData(compactKey, {
      pages: [
        {
          data: [
            {
              id: 'compact-post-1',
              viewer: { isLiked: false, isSaved: false, isReposted: false, isOwner: false },
              stats: { likes: 10, comments: 2, reposts: 1 },
            },
          ],
        },
      ],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useLikeMutation('compact-post-1', false, compactKey), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate();
    });

    const updated = queryClient.getQueryData<{
      pages: { data: { id: string; viewer: { isLiked: boolean }; stats: { likes: number } }[] }[];
    }>(compactKey);

    expect(updated?.pages[0].data[0].viewer.isLiked).toBe(true);
    expect(updated?.pages[0].data[0].stats.likes).toBe(11);
  });
});
