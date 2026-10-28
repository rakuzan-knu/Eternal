import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/api/httpClient';
import { REEL_COMMENTS_KEY, REELS_FEED_KEY, USER_REELS_KEY } from '@/shared/api/queryKeys';
import { DEFAULT_SEED_REELS } from '@/entities/reel';
import { useAddReelComment, type ReelComment } from '../reelsApi';

afterEach(() => vi.restoreAllMocks());

const reel = DEFAULT_SEED_REELS[0];
const comment: ReelComment = {
  id: 'confirmed-comment',
  reelId: reel.id,
  userId: reel.author.id,
  content: 'A real comment',
  createdAt: '2026-10-21T10:00:00Z',
  user: reel.author,
};

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const initial = {
    pages: [{ data: [reel], meta: { nextCursor: null, hasNextPage: false } }],
    pageParams: [],
  };
  client.setQueryData([REELS_FEED_KEY], initial);
  client.setQueryData([USER_REELS_KEY, reel.authorId], initial);
  client.setQueryData(['reel', reel.id], reel);
  return { client, initial, ...renderHook(() => useAddReelComment(), { wrapper }) };
}

describe('Reel comment persistence', () => {
  it.each([false, true])(
    'keeps all caches unchanged on failure (cached comments: %s)',
    async (cached) => {
      const failure = new Error('Service unavailable');
      vi.spyOn(apiClient, 'post').mockRejectedValue(failure);
      const { client, result, initial } = setup();
      if (cached) client.setQueryData([REEL_COMMENTS_KEY, reel.id], [comment]);

      await act(async () => {
        await expect(
          result.current.mutateAsync({ reelId: reel.id, content: 'Do not fabricate this' }),
        ).rejects.toBe(failure);
      });

      expect(client.getQueryData([REEL_COMMENTS_KEY, reel.id])).toEqual(
        cached ? [comment] : undefined,
      );
      expect(client.getQueryData([REELS_FEED_KEY])).toEqual(initial);
      expect(client.getQueryData([USER_REELS_KEY, reel.authorId])).toEqual(initial);
      expect(client.getQueryData(['reel', reel.id])).toEqual(reel);
    },
  );

  it('adds only the server comment and updates all existing Reel views after confirmation', async () => {
    let confirm!: (value: { data: ReelComment }) => void;
    vi.spyOn(apiClient, 'post').mockImplementation(
      () =>
        new Promise((resolve) => {
          confirm = resolve;
        }),
    );
    const { client, result, initial } = setup();
    let submission!: Promise<ReelComment>;
    await act(async () => {
      submission = result.current.mutateAsync({ reelId: reel.id, content: comment.content });
    });
    expect(client.getQueryData([REEL_COMMENTS_KEY, reel.id])).toBeUndefined();
    expect(client.getQueryData([REELS_FEED_KEY])).toEqual(initial);

    await act(async () => {
      confirm({ data: comment });
      await submission;
    });
    expect(client.getQueryData([REEL_COMMENTS_KEY, reel.id])).toEqual([comment]);
    const updated = {
      ...initial,
      pages: [{ ...initial.pages[0], data: [{ ...reel, commentsCount: reel.commentsCount + 1 }] }],
    };
    expect(client.getQueryData([REELS_FEED_KEY])).toEqual(updated);
    expect(client.getQueryData([USER_REELS_KEY, reel.authorId])).toEqual(updated);
    expect(client.getQueryData(['reel', reel.id])).toEqual({
      ...reel,
      commentsCount: reel.commentsCount + 1,
    });
  });
});
