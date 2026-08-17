import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRepostMutation } from '../useRepostMutation';
import { postsApi } from '../../api/postsApi';
import { FEED_KEY } from '@/shared/api/queryKeys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { PostType } from '@/entities/post/model/types';

describe('useRepostMutation', () => {
  it('optimistically toggles repost status and increments count', async () => {
    vi.spyOn(postsApi, 'repost').mockResolvedValue({ success: true } as unknown as {
      success: boolean;
    });
    const queryClient = new QueryClient();

    const mockPost: Partial<PostType> = {
      id: 'post-1',
      isReposted: false,
      reposts: 2,
    };

    queryClient.setQueryData([FEED_KEY], {
      pages: [{ posts: [mockPost] }],
      pageParams: [undefined],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRepostMutation('post-1', false), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const cached = queryClient.getQueryData<{ pages: { posts: PostType[] }[] }>([FEED_KEY]);
    expect(cached?.pages[0].posts[0].isReposted).toBe(true);
    expect(cached?.pages[0].posts[0].reposts).toBe(3);
  });
});
