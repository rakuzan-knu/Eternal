import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavePostMutation } from '../useSavePostMutation';
import { postsApi } from '../../api/postsApi';
import { FEED_KEY } from '@/shared/api/queryKeys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { PostType } from '@/entities/post/model/types';

describe('useSavePostMutation', () => {
  it('optimistically saves post and updates feed query cache', async () => {
    vi.spyOn(postsApi, 'save').mockResolvedValue({ success: true } as unknown as {
      success: boolean;
    });
    const queryClient = new QueryClient();

    const mockPost: Partial<PostType> = {
      id: 'post-1',
      isSaved: false,
    };

    queryClient.setQueryData([FEED_KEY], {
      pages: [{ posts: [mockPost] }],
      pageParams: [undefined],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useSavePostMutation('post-1', false), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const cached = queryClient.getQueryData<{ pages: { posts: PostType[] }[] }>([FEED_KEY]);
    expect(cached?.pages[0].posts[0].isSaved).toBe(true);
  });
});
