import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { postsApi } from '@/entities/post/api/postsApi';
import { useSavedPosts } from '@/entities/post/model/useSavedPosts';
import { useSavedCollectionsStore } from '@/entities/post/model/useSavedCollectionsStore';
import type { PostType } from '@/entities/post/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { SavedPostsView } from '../SavedPostsView';

it('finds an evicted collection post and restores the All posts window and anchor', async () => {
  const previousAccount = useAuthStore.getState();
  const previousCollections = useSavedCollectionsStore.getState().collections;
  useAuthStore.setState({ userId: 'saved-collection-pagination', isAuthenticated: true });
  useSavedCollectionsStore.setState({
    collections: [
      {
        id: 'early',
        userId: 'saved-collection-pagination',
        name: 'Earlier favorites',
        postIds: ['saved-1', 'saved-499'],
        createdAt: '2026-10-11',
      },
    ],
  });
  const posts: PostType[] = Array.from({ length: 500 }, (_, index) => ({
    id: `saved-${index}`,
    authorId: 'author',
    author: 'Ordinary Author',
    handle: 'ordinary',
    text: `Saved post ${index}`,
    createdAt: '2026-10-11T12:00:00Z',
    media: [],
    likes: 0,
    comments: 0,
    reposts: 0,
    isLiked: false,
    isSaved: true,
    isReposted: false,
  }));
  vi.spyOn(postsApi, 'getSavedPosts').mockImplementation(async (cursor) => {
    const start = Number(cursor ?? 0);
    return {
      posts: posts.slice(start, start + 10),
      nextCursor: start < 490 ? String(start + 10) : null,
    };
  });
  let scrollY = 0;
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
  vi.spyOn(window, 'scrollTo').mockImplementation((...args: unknown[]) => {
    scrollY =
      typeof args[0] === 'number' ? Number(args[1]) : Number((args[0] as ScrollToOptions).top);
    queueMicrotask(() => window.dispatchEvent(new Event('scroll')));
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return new DOMRect(0, -scrollY, 600, 800);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  const hook = renderHook(() => useSavedPosts(), { wrapper });
  let view: { unmount: () => void } | undefined;
  try {
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    for (let index = 0; index < 49; index++) {
      await act(async () => {
        await hook.result.current.fetchNextPage();
      });
      await waitFor(
        () =>
          expect(hook.result.current.data!.pageParams.at(-1)?.cursor).toBe(
            String((index + 1) * 10),
          ),
        { interval: 1 },
      );
    }
    expect(hook.result.current.hasNextPage).toBe(false);
    expect(hook.result.current.hasPreviousPage).toBe(true);
    expect(hook.result.current.data!.pages).toHaveLength(5);
    const allHistory = hook.result.current.window;
    for (let index = 0; index < 500; index++) allHistory.heights.set(index, 800);
    allHistory.anchor = { id: 'saved-491', offset: 100 };
    allHistory.scrollY = 392900;
    hook.unmount();
    view = render(<SavedPostsView userId="saved-collection-pagination" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /All posts/ }));
    await waitFor(() =>
      expect(document.querySelector('[data-post-id="saved-491"]')).not.toBeNull(),
    );
    expect(scrollY).toBe(392900);
    const allHeight = screen.getByTestId('bounded-post-list').style.height;
    fireEvent.click(screen.getByRole('button', { name: /Back to collections/ }));
    fireEvent.click(screen.getByRole('button', { name: /Earlier favorites/ }));
    await waitFor(() => expect(screen.getByText('Saved post 1')).toBeInTheDocument(), {
      timeout: 5000,
    });
    await waitFor(() => expect(screen.getByText('Saved post 499')).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(screen.queryByText('No saved posts in this collection')).not.toBeInTheDocument();
    expect(screen.getByTestId('bounded-post-list')).toHaveAttribute('data-live-post-count', '2');
    expect(allHistory.heightBefore(450)).toBe(360000);
    expect(allHistory.anchor).toEqual({ id: 'saved-491', offset: 100 });
    fireEvent.click(screen.getByRole('button', { name: /Back to collections/ }));
    fireEvent.click(screen.getByRole('button', { name: /All posts/ }));
    await waitFor(() =>
      expect(document.querySelector('[data-post-id="saved-491"]')).not.toBeNull(),
    );
    expect(scrollY).toBe(392900);
    expect(screen.getByTestId('bounded-post-list')).toHaveAttribute('data-feed-start', '450');
    expect(screen.getByTestId('bounded-post-list').style.height).toBe(allHeight);
  } finally {
    hook.unmount();
    view?.unmount();
    client.clear();
    useSavedCollectionsStore.setState({ collections: previousCollections });
    useAuthStore.setState({
      userId: previousAccount.userId,
      isAuthenticated: previousAccount.isAuthenticated,
    });
    vi.restoreAllMocks();
  }
}, 25000);
