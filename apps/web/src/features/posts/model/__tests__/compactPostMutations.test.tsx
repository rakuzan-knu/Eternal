import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { InfiniteData, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { useDeletePostMutation } from '../useDeletePostMutation';
import { useEditPostMutation } from '../useEditPostMutation';
import { useSavePostMutation } from '../useSavePostMutation';
import { useRepostMutation } from '../useRepostMutation';
import { postsApi } from '../../api/postsApi';
import type { CompactFeedResponse } from '@/entities/post/api/postsApi';

const key = ['feed', 'compact', 'latest', 20];
const initial: CompactFeedResponse = {
  data: [
    {
      id: 'post-1',
      content: 'Original content',
      createdAt: '2026-10-11T12:00:00Z',
      author: {
        id: 'author-1',
        username: 'ordinary',
        displayName: 'Ordinary Author',
        avatar: null,
        isVerified: false,
      },
      mediaPreview: { type: 'IMAGE', url: '/media/one.webp', totalCount: 2 },
      stats: { likes: 3, comments: 0, reposts: 1 },
      viewer: { isLiked: false, isSaved: false, isReposted: false, isOwner: true },
    },
  ],
  meta: { nextCursor: null, hasMore: false, count: 1 },
};
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(key, { pages: [structuredClone(initial)], pageParams: [undefined] });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    client,
    wrapper,
    page: () => client.getQueryData<InfiniteData<CompactFeedResponse>>(key)!.pages[0],
  };
}
describe('compact post mutation projections', () => {
  it('removes a deleted post from the compact window', async () => {
    const { client, wrapper, page } = setup();
    vi.spyOn(postsApi, 'deletePost').mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDeletePostMutation('post-1', key), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(page().data).toEqual([]);
    client.clear();
  });
  it('edits compact content without discarding media or viewer fields', async () => {
    const { client, wrapper, page } = setup();
    vi.spyOn(postsApi, 'editPost').mockResolvedValue({
      id: 'post-1',
      authorId: 'author-1',
      author: 'Ordinary Author',
      handle: 'ordinary',
      text: 'Edited content',
      createdAt: '2026-10-11T12:00:00Z',
    });
    const { result } = renderHook(() => useEditPostMutation('post-1', key), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('Edited content');
    });
    expect(page().data[0].content).toBe('Edited content');
    expect(page().data[0].mediaPreview?.totalCount).toBe(2);
    expect(page().data[0].viewer.isOwner).toBe(true);
    client.clear();
  });
  it('updates saved state in a compact window', async () => {
    const { client, wrapper, page } = setup();
    vi.spyOn(postsApi, 'save').mockResolvedValue({ success: true });
    const { result } = renderHook(() => useSavePostMutation('post-1', false, key), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(page().data[0].viewer.isSaved).toBe(true);
    client.clear();
  });
  it('increments a compact repost once across matching query prefixes', async () => {
    const { client, wrapper, page } = setup();
    vi.spyOn(postsApi, 'repost').mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRepostMutation('post-1', false, key), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(page().data[0].viewer.isReposted).toBe(true);
    expect(page().data[0].stats.reposts).toBe(2);
    client.clear();
  });
});
