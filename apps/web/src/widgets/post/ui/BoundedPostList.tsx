import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { PostType } from '@/entities/post/model/types';
import type { PostFeedWindow } from '@/entities/post/model/postFeedWindow';
import { PostCard } from './PostCard';

interface WindowQuery {
  data?: { pages: unknown[] };
  window?: PostFeedWindow;
  startIndex?: number;
  knownItemCount?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  isFetching?: boolean;
  fetchNextPage?: () => Promise<unknown>;
  fetchPreviousPage?: () => Promise<unknown>;
}
interface Props {
  posts: PostType[];
  query: WindowQuery;
  queryKey: unknown[];
  includePost?: (post: PostType) => boolean;
  initialScrollY?: number;
}

/** Offloaded rows retain their measured geometry while either direction is replayed. */
export function BoundedPostList({ posts, query, queryKey, includePost, initialScrollY }: Props) {
  const { window: history, startIndex = 0, knownItemCount = posts.length } = query;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const restoreTarget = useRef(history?.scrollY ?? initialScrollY);
  const restored = useRef(false);
  const heights = history?.heights;
  const leadingHeight = history?.heightBefore(startIndex) ?? startIndex * 240;
  const trailingHeight = Math.max(
    0,
    (history?.heightBefore(knownItemCount) ?? knownItemCount * 240) -
      (history?.heightBefore(startIndex + posts.length) ?? (startIndex + posts.length) * 240),
  );
  const virtualizer = useWindowVirtualizer<HTMLDivElement>({
    // The virtualizer's own measurement arrays are bounded to the live window too.
    count: posts.length,
    estimateSize: (index) => heights?.get(startIndex + index) ?? 240,
    getItemKey: (index) => posts[index]?.id ?? `post-slot-${startIndex + index}`,
    overscan: 5,
    scrollMargin: scrollMargin + leadingHeight,
    initialOffset: restoreTarget.current ?? 0,
    measureElement: (element, entry) => {
      const size =
        entry?.borderBoxSize?.[0]?.blockSize ||
        element.getBoundingClientRect().height ||
        element.offsetHeight;
      const index = startIndex + Number(element.dataset.index);
      if (size >= 0 && Number.isFinite(index)) heights?.set(index, size);
      return size;
    },
    onChange: (instance, sync) => {
      if (sync && history && restored.current) {
        history.scrollY = window.scrollY;
        const visible = instance
          .getVirtualItems()
          .find((item) => item.start + item.size > window.scrollY);
        const post = visible && posts[visible.index];
        if (visible && post)
          history.anchor = { id: String(post.id), offset: window.scrollY - visible.start };
      }
    },
  });
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => setScrollMargin(container.getBoundingClientRect().top + window.scrollY);
    measure();
    // Stories and the composer can resize above the list without changing its data.
    const observer = new ResizeObserver(measure);
    observer.observe(container.parentElement ?? container);
    return () => observer.disconnect();
  }, [knownItemCount]);
  useLayoutEffect(() => {
    if (restoreTarget.current !== undefined)
      window.scrollTo({ top: restoreTarget.current, behavior: 'instant' });
    restored.current = true;
    return () => {
      if (history) history.scrollY = window.scrollY;
    };
  }, [history]);
  useLayoutEffect(() => {
    // Discard the virtualizer's ID-keyed size cache on eviction; row estimates
    // come from our bounded layout history, while connected DOM rows stay mounted.
    virtualizer.measure();
  }, [startIndex, virtualizer]);
  useLayoutEffect(() => {
    const anchor = history?.anchor;
    if (!anchor) return;
    const index = posts.findIndex((post) => String(post.id) === anchor.id);
    if (index < 0) return;
    const item = virtualizer.getVirtualItems().find((row) => row.index === index);
    if (!item) return;
    const target = item.start + anchor.offset;
    if (Math.abs(window.scrollY - target) > 1)
      window.scrollTo({ top: target, behavior: 'instant' });
  }, [posts, startIndex, scrollMargin, leadingHeight, history, virtualizer]);
  const virtualItems = virtualizer.getVirtualItems();
  const rangeStart = virtualizer.range?.startIndex;
  const rangeEnd = virtualizer.range?.endIndex;
  const { isFetching, hasPreviousPage, hasNextPage, fetchPreviousPage, fetchNextPage } = query;
  useEffect(() => {
    if (rangeStart === undefined || rangeEnd === undefined || isFetching) return;
    // Use visible rows, not overscan: prefetching both boundaries would oscillate the window.
    if (rangeStart < 2 && hasPreviousPage) {
      void fetchPreviousPage?.();
    } else if (rangeEnd >= posts.length - 2 && hasNextPage) {
      void fetchNextPage?.();
    }
  }, [
    rangeStart,
    rangeEnd,
    startIndex,
    posts.length,
    isFetching,
    hasPreviousPage,
    hasNextPage,
    fetchPreviousPage,
    fetchNextPage,
  ]);
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#post-')) return;
    const index = posts.findIndex((post) => String(post.id) === hash.slice(6));
    if (index >= 0) virtualizer.scrollToIndex(index, { align: 'center' });
  }, [posts, startIndex, virtualizer]);

  return (
    <div
      ref={containerRef}
      data-testid="bounded-post-list"
      data-window-start={startIndex}
      data-live-post-count={posts.length}
      data-known-post-count={knownItemCount}
      data-feed-window-pages={query.data?.pages.length ?? 0}
      data-feed-start={startIndex}
      data-feed-end={startIndex + posts.length}
      data-feed-total={knownItemCount}
      style={{
        height: leadingHeight + virtualizer.getTotalSize() + trailingHeight,
        width: '100%',
        position: 'relative',
        overflowAnchor: 'none',
      }}
    >
      {virtualItems.map((item) => {
        const post = posts[item.index];
        const hidden = post && includePost && !includePost(post);
        return (
          <div
            key={item.key}
            ref={post ? virtualizer.measureElement : undefined}
            data-index={item.index}
            data-post-ordinal={startIndex + item.index}
            data-post-id={post?.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start - scrollMargin}px)`,
              paddingBottom: hidden ? 0 : 16,
            }}
          >
            {hidden ? null : post ? (
              <PostCard post={post} queryKey={queryKey} />
            ) : (
              <div
                role="status"
                aria-label="Loading posts"
                className="rounded-3xl bg-white/[0.02] animate-pulse"
                style={{ height: item.size - 16 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
