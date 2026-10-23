import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoundedPostList } from '../BoundedPostList';
import { PostFeedWindow } from '@/entities/post/model/postFeedWindow';
import type { PostType } from '@/entities/post/model/types';

const posts: PostType[] = Array.from({ length: 10 }, (_, index) => ({
  id: `post-${index}`,
  authorId: 'author',
  author: 'Ordinary Author',
  handle: 'ordinary',
  text: `Content ${index}`,
  createdAt: '2026-10-11T12:00:00Z',
  media: [],
  likes: 0,
  comments: 0,
  reposts: 0,
  isLiked: false,
  isSaved: false,
  isReposted: false,
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('bounded post scroll anchors', () => {
  it('keeps the post anchor when the composer above the list resizes', async () => {
    let scrollY = 1100;
    let listTop = 200;
    const observers: {
      callback: ResizeObserverCallback;
      targets: Set<Element>;
      disconnect: ReturnType<typeof vi.fn>;
    }[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        targets = new Set<Element>();
        disconnect = vi.fn();
        constructor(public callback: ResizeObserverCallback) {
          observers.push(this);
        }
        observe(target: Element) {
          this.targets.add(target);
        }
        unobserve(target: Element) {
          this.targets.delete(target);
        }
      },
    );
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
    vi.spyOn(window, 'scrollTo').mockImplementation((...args: unknown[]) => {
      scrollY =
        typeof args[0] === 'number' ? Number(args[1]) : Number((args[0] as ScrollToOptions).top);
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const top = this.dataset.testid === 'bounded-post-list' ? listTop - scrollY : 0;
      return new DOMRect(0, top, 600, 800);
    });
    const history = new PostFeedWindow();
    history.remember(undefined, 10, null);
    history.scrollY = scrollY;
    history.anchor = { id: 'post-1', offset: 100 };
    for (let index = 0; index < 10; index++) history.heights.set(index, 800);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { getByTestId, unmount } = render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <BoundedPostList
            posts={posts}
            query={{ window: history, startIndex: 0, knownItemCount: 10 }}
            queryKey={['feed']}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(scrollY).toBe(1100));
    const layoutObserver = observers.find((observer) =>
      observer.targets.has(getByTestId('bounded-post-list').parentElement!),
    );
    expect(layoutObserver).toBeDefined();
    listTop = 350;
    act(() => layoutObserver!.callback([], {} as ResizeObserver));
    await waitFor(() => expect(scrollY).toBe(1250));
    unmount();
    expect(layoutObserver!.disconnect).toHaveBeenCalledOnce();
    client.clear();
  });

  it('preserves a distant post anchor while mutation boundaries are rebased', async () => {
    let scrollY = 32900;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
    vi.spyOn(window, 'scrollTo').mockImplementation((...args: unknown[]) => {
      scrollY =
        typeof args[0] === 'number' ? Number(args[1]) : Number((args[0] as ScrollToOptions).top);
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return new DOMRect(0, -scrollY, 600, 800);
    });
    const history = new PostFeedWindow();
    history.remember('after-39', 10, 'after-49', { ordinal: 4, startIndex: 40 });
    history.scrollY = scrollY;
    history.anchor = { id: 'post-1', offset: 100 };
    for (let index = 0; index < 60; index++) history.heights.set(index, 800);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
    const { rerender, unmount } = render(
      <BoundedPostList
        posts={posts}
        query={{ window: history, startIndex: 40, knownItemCount: 60 }}
        queryKey={['feed']}
      />,
      { wrapper },
    );
    await waitFor(() => expect(document.querySelector('[data-post-id="post-1"]')).not.toBeNull());
    history.beginRevision(1);
    history.remember('after-38', 11, 'after-49', { ordinal: 4, startIndex: 40 });
    rerender(
      <BoundedPostList
        posts={[{ ...posts[0], id: 'inserted' }, ...posts]}
        query={{ window: history, startIndex: 40, knownItemCount: 61 }}
        queryKey={['feed']}
      />,
    );
    await waitFor(() => expect(scrollY).toBe(33700));
    unmount();
    client.clear();
  });

  it('keeps the same post at the same viewport offset when a post is inserted above it', async () => {
    let scrollY = 900;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
    vi.spyOn(window, 'scrollTo').mockImplementation((...args: unknown[]) => {
      scrollY =
        typeof args[0] === 'number' ? Number(args[1]) : Number((args[0] as ScrollToOptions).top);
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return new DOMRect(0, -scrollY, 600, 800);
    });
    const history = new PostFeedWindow();
    history.remember(undefined, 10, null);
    history.scrollY = 900;
    for (let index = 0; index < 10; index++) history.heights.set(index, 800);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
    const query = { window: history, startIndex: 0, knownItemCount: 10, data: { pages: [] } };
    const { rerender, unmount } = render(
      <BoundedPostList posts={posts} query={query} queryKey={['feed']} />,
      { wrapper },
    );
    act(() => window.dispatchEvent(new Event('scroll')));
    await waitFor(() => expect(document.querySelector('[data-post-id="post-1"]')).not.toBeNull());
    const inserted: PostType = { ...posts[0], id: 'new-post', text: 'Inserted above viewport' };
    history.remember(undefined, 11, null);
    rerender(
      <BoundedPostList
        posts={[inserted, ...posts]}
        query={{ ...query, knownItemCount: 11 }}
        queryKey={['feed']}
      />,
    );
    await waitFor(() => expect(scrollY).toBe(1700));
    unmount();
    client.clear();
  });
  it('restores a saved scroll position after returning from post detail', () => {
    const history = new PostFeedWindow();
    history.remember(undefined, 10, null);
    history.scrollY = 1200;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
    const { unmount } = render(
      <BoundedPostList
        posts={posts}
        query={{ window: history, knownItemCount: 10 }}
        queryKey={['feed']}
      />,
      { wrapper },
    );
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: 'instant' });
    unmount();
    client.clear();
  });

  it('does not replay an old anchor when cached posts refetch without changing order', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const history = new PostFeedWindow();
    history.remember(undefined, 10, null);
    history.scrollY = 1200;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
    const query = { window: history, knownItemCount: 10 };
    const { rerender, unmount } = render(
      <BoundedPostList posts={posts} query={query} queryKey={['feed']} />,
      { wrapper },
    );
    history.anchor = { id: 'post-0', offset: 100 };
    scrollTo.mockClear();
    rerender(
      <BoundedPostList
        posts={posts.map((post) => ({ ...post, likes: (post.likes ?? 0) + 1 }))}
        query={query}
        queryKey={['feed']}
      />,
    );
    expect(scrollTo).not.toHaveBeenCalled();
    unmount();
    client.clear();
  });
});
