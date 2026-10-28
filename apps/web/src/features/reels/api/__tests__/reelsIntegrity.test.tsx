import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/api/httpClient';
import { REELS_FEED_KEY, USER_REELS_KEY } from '@/shared/api/queryKeys';
import { DEFAULT_SEED_REELS } from '@/entities/reel';
import {
  useNotInterestedReel,
  useRecordReelShare,
  useReelsFeed,
  useReportReel,
  useToggleSaveReel,
} from '../reelsApi';

afterEach(() => vi.restoreAllMocks());

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('Reel feed integrity', () => {
  it.each([{ data: [] }, { data: [DEFAULT_SEED_REELS[2]] }])(
    'returns exactly the server feed without injected reels',
    async ({ data }) => {
      const response = { data, meta: { nextCursor: null, hasNextPage: false } };
      vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response });
      const { wrapper } = setup();
      const { result } = renderHook(() => useReelsFeed(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.pages).toEqual([response]);
    },
  );

  it('exposes a failed feed instead of substituting sample videos', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Offline'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useReelsFeed(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('Reel action integrity', () => {
  it('increments the share counter only when recording succeeds', async () => {
    const { client, wrapper } = setup();
    const reel = DEFAULT_SEED_REELS[0];
    const feed = {
      pages: [{ data: [reel], meta: { nextCursor: null, hasNextPage: false } }],
      pageParams: [],
    };
    client.setQueryData([REELS_FEED_KEY], feed);
    client.setQueryData([USER_REELS_KEY, reel.authorId], feed);
    client.setQueryData(['reel', reel.id], reel);
    vi.spyOn(apiClient, 'post')
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ data: { success: true } });
    const { result } = renderHook(() => useRecordReelShare(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(reel.id)).rejects.toThrow('Offline');
    });
    expect(client.getQueryData([REELS_FEED_KEY])).toEqual(feed);
    expect(client.getQueryData([USER_REELS_KEY, reel.authorId])).toEqual(feed);
    expect(client.getQueryData(['reel', reel.id])).toEqual(reel);
    await act(async () => {
      await result.current.mutateAsync(reel.id);
    });
    expect(client.getQueryData([REELS_FEED_KEY])).toEqual({
      ...feed,
      pages: [{ ...feed.pages[0], data: [{ ...reel, sharesCount: reel.sharesCount + 1 }] }],
    });
    expect(client.getQueryData([USER_REELS_KEY, reel.authorId])).toEqual({
      ...feed,
      pages: [{ ...feed.pages[0], data: [{ ...reel, sharesCount: reel.sharesCount + 1 }] }],
    });
    expect(client.getQueryData(['reel', reel.id])).toEqual({
      ...reel,
      sharesCount: reel.sharesCount + 1,
    });
  });
  it('preserves saved state and counters on a failed toggle', async () => {
    const { client, wrapper } = setup();
    const reel = DEFAULT_SEED_REELS[0];
    const feed = {
      pages: [{ data: [reel], meta: { nextCursor: null, hasNextPage: false } }],
      pageParams: [],
    };
    client.setQueryData([REELS_FEED_KEY], feed);
    client.setQueryData([USER_REELS_KEY, reel.authorId], feed);
    client.setQueryData(['reel', reel.id], reel);
    const failure = new Error('Offline');
    vi.spyOn(apiClient, 'post').mockRejectedValue(failure);
    const { result } = renderHook(() => useToggleSaveReel(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ reelId: reel.id, saved: true })).rejects.toBe(
        failure,
      );
    });
    expect(client.getQueryData([REELS_FEED_KEY])).toEqual(feed);
    expect(client.getQueryData([USER_REELS_KEY, reel.authorId])).toEqual(feed);
    expect(client.getQueryData(['reel', reel.id])).toEqual(reel);
  });

  it.each([true, false])(
    'uses confirmed saved state %s and count across existing views',
    async (saved) => {
      const { client, wrapper } = setup();
      const reel = DEFAULT_SEED_REELS[0];
      const feed = {
        pages: [{ data: [reel], meta: { nextCursor: null, hasNextPage: false } }],
        pageParams: [],
      };
      client.setQueryData([REELS_FEED_KEY], feed);
      client.setQueryData([USER_REELS_KEY, reel.authorId], feed);
      client.setQueryData(['reel', reel.id], reel);
      vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { saved, savedCount: 12 } });
      vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { saved, savedCount: 12 } });
      const { result } = renderHook(() => useToggleSaveReel(), { wrapper });
      await act(async () => {
        await result.current.mutateAsync({ reelId: reel.id, saved });
      });
      const updatedReel = { ...reel, isSaved: saved, savedCount: 12 };
      const updatedFeed = { ...feed, pages: [{ ...feed.pages[0], data: [updatedReel] }] };
      expect(client.getQueryData([REELS_FEED_KEY])).toEqual(updatedFeed);
      expect(client.getQueryData([USER_REELS_KEY, reel.authorId])).toEqual(updatedFeed);
      expect(client.getQueryData(['reel', reel.id])).toEqual(updatedReel);
    },
  );

  it('rejects network failures for both preferences and reports', async () => {
    const { wrapper } = setup();
    const failure = new Error('Offline');
    vi.spyOn(apiClient, 'post').mockRejectedValue(failure);
    const { result } = renderHook(
      () => ({ hide: useNotInterestedReel(), report: useReportReel() }),
      { wrapper },
    );
    await act(async () => {
      await expect(result.current.hide.mutateAsync('reel-1')).rejects.toBe(failure);
      await expect(
        result.current.report.mutateAsync({
          reelId: 'reel-1',
          category: 'SPAM',
          details: 'Details',
        }),
      ).rejects.toBe(failure);
    });
  });

  it('does not treat a negative server acknowledgement as success', async () => {
    const { wrapper } = setup();
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: false } });
    const { result } = renderHook(
      () => ({ hide: useNotInterestedReel(), report: useReportReel() }),
      { wrapper },
    );
    await act(async () => {
      await expect(result.current.hide.mutateAsync('reel-1')).rejects.toThrow('Could not update');
      await expect(
        result.current.report.mutateAsync({ reelId: 'reel-1', category: 'SPAM' }),
      ).rejects.toThrow('Could not submit');
    });
  });
});
