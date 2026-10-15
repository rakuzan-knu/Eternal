import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/api/httpClient';
import { REELS_FEED_KEY } from '@/shared/api/queryKeys';
import { useCreateReel } from '../reelsApi';

afterEach(() => vi.restoreAllMocks());

it('preserves a failed publication and does not insert a fabricated local Reel', async () => {
  const failure = new Error('Service unavailable');
  vi.spyOn(apiClient, 'post')
    .mockResolvedValueOnce({ data: { mode: 'proxy' } })
    .mockRejectedValueOnce(failure);
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const initial = {
    pages: [{ data: [], meta: { nextCursor: null, hasNextPage: false } }],
    pageParams: [],
  };
  client.setQueryData([REELS_FEED_KEY], initial);
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useCreateReel(), { wrapper });
  const body = new FormData();
  body.append('video', new File(['video'], 'clip.mp4', { type: 'video/mp4' }));
  await act(async () => {
    await expect(result.current.mutateAsync(body)).rejects.toBe(failure);
  });
  expect(client.getQueryData([REELS_FEED_KEY])).toEqual(initial);
});
