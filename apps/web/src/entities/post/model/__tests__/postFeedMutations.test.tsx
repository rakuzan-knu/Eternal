import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { FEED_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { invalidatePostFeedHistory } from '../postFeedColdCache';
import { useBoundedPostFeed } from '../useBoundedPostFeed';

type Page = { posts: { id: string }[]; nextCursor: string | null };

describe('bounded feed boundaries after mutations', () => {
  it.each([
    'delete evicted head',
    'delete evicted cursor',
    'insert at head',
    'optimistic deletion',
    'realtime insertion',
    'refetch after head insertion',
  ])('%s restores a contiguous five-page window when reversing', async (mutation) => {
    const previousAccount = useAuthStore.getState();
    useAuthStore.setState({ userId: 'feed-mutations', isAuthenticated: true });
    let serverIds = Array.from({ length: 70 }, (_, index) => String(index));
    const queryKey = [FEED_KEY, 'mutation-boundary', mutation];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, unmount } = renderHook(
      () =>
        useBoundedPostFeed<Page>({
          queryKey,
          fetchPage: async (cursor) => {
            const start =
              cursor === undefined
                ? 0
                : serverIds.findIndex((id) => Number(id) > Number(cursor.slice(6)));
            const ids = serverIds.slice(start, start + 10);
            return {
              posts: ids.map((id) => ({ id })),
              nextCursor: start + ids.length < serverIds.length ? `after-${ids.at(-1)}` : null,
            };
          },
          getCount: (page) => page.posts.length,
          getNextCursor: (page) => page.nextCursor,
        }),
      { wrapper },
    );
    try {
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      for (let index = 0; index < 5; index++) {
        await act(async () => {
          await result.current.fetchNextPage();
        });
        await waitFor(() =>
          expect(result.current.data!.pageParams.at(-1)?.ordinal).toBe(index + 1),
        );
      }
      expect(result.current.data!.pages[0].posts[0].id).toBe('10');
      result.current.window.anchor = { id: '20', offset: 33 };
      if (mutation.includes('insertion') || mutation === 'insert at head') {
        serverIds = ['-1', ...serverIds];
      } else
        serverIds = serverIds.filter(
          (id) =>
            id !==
            (mutation === 'optimistic deletion'
              ? '28'
              : mutation === 'delete evicted cursor'
                ? '9'
                : '0'),
        );
      await act(async () => {
        if (mutation === 'optimistic deletion') {
          client.setQueryData<InfiniteData<Page>>(queryKey, (data) => ({
            ...data!,
            pages: data!.pages.map((page) => ({
              ...page,
              posts: page.posts.filter((post) => post.id !== '28'),
            })),
          }));
        } else if (mutation === 'realtime insertion') {
          client.setQueryData<InfiniteData<Page>>(queryKey, (data) => ({
            ...data!,
            pages: data!.pages.map((page, index) =>
              index === 0 ? { ...page, posts: [{ id: '-1' }, ...page.posts] } : page,
            ),
          }));
        } else if (mutation === 'refetch after head insertion') {
          await client.invalidateQueries({ queryKey, exact: true });
        } else invalidatePostFeedHistory();
        await result.current.fetchPreviousPage();
      });
      await waitFor(() => expect(result.current.data!.pageParams[0].ordinal).toBe(0));
      const expected =
        mutation.includes('insertion') || mutation === 'insert at head'
          ? ['-1', ...Array.from({ length: 49 }, (_, index) => String(index))]
          : mutation === 'delete evicted cursor'
            ? [
                ...Array.from({ length: 9 }, (_, index) => String(index)),
                ...Array.from({ length: 41 }, (_, index) => String(index + 10)),
              ]
            : mutation === 'optimistic deletion'
              ? [
                  ...Array.from({ length: 28 }, (_, index) => String(index)),
                  ...Array.from({ length: 22 }, (_, index) => String(index + 29)),
                ]
              : Array.from({ length: 50 }, (_, index) => String(index + 1));
      expect(
        result.current.data!.pages.flatMap((page) => page.posts.map((post) => post.id)),
      ).toEqual(expected);
      expect(result.current.data!.pages.length).toBeLessThanOrEqual(5);
      expect(result.current.window.pages.length).toBeLessThanOrEqual(256);
      expect(result.current.window.anchor).toEqual({ id: '20', offset: 33 });
      expect(
        result.current.data!.pages.some((page) => page.posts.some((post) => post.id === '20')),
      ).toBe(true);
      await act(async () => {
        await result.current.fetchNextPage();
      });
      await waitFor(() => expect(result.current.data!.pageParams[0].ordinal).toBe(1));
      await act(async () => {
        await result.current.fetchPreviousPage();
      });
      await waitFor(() => expect(result.current.data!.pageParams[0].ordinal).toBe(0));
      expect(
        result.current.data!.pages.flatMap((page) => page.posts.map((post) => post.id)),
      ).toEqual(expected);
    } finally {
      unmount();
      client.clear();
      useAuthStore.setState({
        userId: previousAccount.userId,
        isAuthenticated: previousAccount.isAuthenticated,
      });
    }
  });
});
