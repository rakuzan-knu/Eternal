import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { usePostsFeed } from '../usePostsFeed';
import { useUserPosts } from '../useUserPosts';
import { useSavedPosts } from '../useSavedPosts';
import { useUserReposts } from '../useUserReposts';
import { useCompactFeed } from '../useCompactFeed';
import { postsApi, type CompactFeedResponse, type FeedPage } from '../../api/postsApi';
import type { PostType } from '../types';

function ordinaryPost(index: number): PostType {
  return {
    id: `ordinary-${index}`,
    authorId: 'author-1',
    author: 'Ordinary Author',
    handle: 'ordinary',
    text: `Ordinary post ${index}`,
    createdAt: '2026-10-11T12:00:00Z',
    likes: 0,
    comments: 0,
    reposts: 0,
    isLiked: false,
    isSaved: true,
    isReposted: false,
    media: [
      {
        id: `image-${index}`,
        type: 'image',
        url: `/media/photo-${index}.webp`,
        width: 1200,
        height: 800,
      },
      {
        id: `video-${index}`,
        type: 'video',
        url: `/media/video-${index}.mp4`,
        poster: `/media/poster-${index}.webp`,
        width: 1920,
        height: 1080,
      },
    ],
  };
}

const ordinaryPosts = Array.from({ length: 500 }, (_, index) => ordinaryPost(index));
function page(after?: string): FeedPage {
  const start = after ? Number(after) : 0;
  return {
    posts: ordinaryPosts.slice(start, start + 10),
    nextCursor: start < 490 ? String(start + 10) : null,
  };
}
function compactPage(after?: string): CompactFeedResponse {
  const result = page(after);
  return {
    data: result.posts.map((post) => ({
      id: String(post.id),
      content: post.text,
      createdAt: post.createdAt,
      author: {
        id: post.authorId,
        displayName: post.author,
        username: post.handle,
        avatar: null,
        isVerified: false,
      },
      mediaPreview: { type: 'IMAGE', url: post.media![0].url, totalCount: 2 },
      viewer: { isLiked: false, isSaved: true, isReposted: false, isOwner: false },
      stats: { likes: 0, comments: 0, reposts: 0 },
    })),
    meta: { nextCursor: result.nextCursor, hasMore: result.nextCursor !== null, count: 10 },
  };
}

describe('bounded post feeds with 500 ordinary multi-media posts', () => {
  it.each([
    ['home', () => usePostsFeed()],
    ['profile', () => useUserPosts('author-1')],
    ['saved', () => useSavedPosts()],
    ['reposts', () => useUserReposts('author-1')],
    ['compact', () => useCompactFeed()],
  ] as const)(
    '%s keeps five live pages and can return to the first post',
    async (_name, hook) => {
      vi.spyOn(postsApi, 'getFeed').mockImplementation(async (after) => page(after));
      vi.spyOn(postsApi, 'getUserPosts').mockImplementation(async (_userId, after) => page(after));
      vi.spyOn(postsApi, 'getSavedPosts').mockImplementation(async (after) => page(after));
      vi.spyOn(postsApi, 'getUserReposts').mockImplementation(async (_userId, after) =>
        page(after),
      );
      vi.spyOn(postsApi, 'getCompactFeed').mockImplementation(async (after) => compactPage(after));
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
      const { result, unmount } = renderHook<
        ReturnType<typeof usePostsFeed> | ReturnType<typeof useCompactFeed>,
        void
      >(() => hook(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      for (let index = 0; index < 49; index++) {
        await act(async () => {
          await result.current.fetchNextPage();
        });
        await waitFor(
          () =>
            expect(result.current.data!.pageParams.at(-1)?.cursor).toBe(String((index + 1) * 10)),
          { interval: 1 },
        );
        // Removing the window bound retains all 500 full post/media objects.
        expect(result.current.data!.pages.length).toBeLessThanOrEqual(5);
      }
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.hasPreviousPage).toBe(true);
      for (let index = 0; index < 45; index++) {
        await act(async () => {
          await result.current.fetchPreviousPage();
        });
        await waitFor(() => expect(result.current.data!.pageParams[0].ordinal).toBe(44 - index), {
          interval: 1,
        });
        expect(result.current.data!.pages.length).toBeLessThanOrEqual(5);
      }
      const first = result.current.data!.pages[0];
      expect('posts' in first ? first.posts[0].id : first.data[0].id).toBe('ordinary-0');
      expect(result.current.hasPreviousPage).toBe(false);
      unmount();
      client.clear();
      vi.restoreAllMocks();
    },
    20_000,
  );
});
