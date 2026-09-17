import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import CreatePost from '../../features/posts/ui/CreatePost';
import { StoriesBar } from '@/widgets/feed/ui/StoriesBar';
import { PostCard } from '@/widgets/post/ui/PostCard';
import { SkeletonFeed } from '../../entities/post/ui/SkeletonPostCard';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';
import { usePostsFeed } from '@/entities/post/model/usePostsFeed';
import { useCreatePost } from '@/features/posts/model/useCreatePost';
import { FEED_KEY } from '@/shared/api/queryKeys';
import { AllCaughtUpBanner } from '@/widgets/feed/ui/AllCaughtUpBanner';
import { SuggestedUsersCarousel } from '@/widgets/feed/ui/SuggestedUsersCarousel';
import { SEOHead } from '@/shared/seo';
import { usePredictivePrefetch } from '@/shared/lib/usePredictivePrefetch';

export default function FeedPage() {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = usePostsFeed();
  const createPost = useCreatePost([FEED_KEY]);
  const hiddenIds = useHiddenPostsStore((s) => s.hiddenIds);

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];
  const visiblePosts = posts.filter((p) => !hiddenIds.has(p.id));

  // Extract upcoming media URLs from tail of the feed for speculative RAM pre-decoding
  const getUpcomingMediaUrls = useCallback(() => {
    const urls: string[] = [];
    const tail = visiblePosts.slice(-5);
    for (const post of tail) {
      const mediaUrl = post?.media?.[0]?.url || post?.image;
      if (mediaUrl) urls.push(mediaUrl);
    }
    return urls;
  }, [visiblePosts]);

  // Enterprise Predictive Viewport Pre-fetching: triggers 600px before end of screen
  const { sentinelRef, predecodeUrls } = usePredictivePrefetch({
    enabled: visiblePosts.length > 0,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    getUpcomingMediaUrls,
    rootMargin: '600px 0px',
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setScrollMargin(containerRef.current.offsetTop);
    }
  }, []);

  const postVirtualizer = useWindowVirtualizer({
    count: visiblePosts.length,
    estimateSize: () => 240,
    overscan: 5,
    scrollMargin,
  });

  const virtualItems = postVirtualizer.getVirtualItems();
  const lastVirtualItem = virtualItems[virtualItems.length - 1];

  useEffect(() => {
    if (!lastVirtualItem) return;

    // Speculative lookahead: pre-decode next 3 posts in virtualizer window
    for (
      let i = lastVirtualItem.index + 1;
      i <= lastVirtualItem.index + 3 && i < visiblePosts.length;
      i++
    ) {
      const post = visiblePosts[i];
      const mediaUrl = post?.media?.[0]?.url || post?.image;
      if (mediaUrl) {
        predecodeUrls([mediaUrl]);
      }
    }

    // Direct virtualizer threshold fallback (if scrolling faster than IO event loop)
    if (lastVirtualItem.index >= visiblePosts.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    lastVirtualItem,
    visiblePosts,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    predecodeUrls,
  ]);

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      <SEOHead
        title="Home • Eternal Social Network"
        description="Connect, discover inspiring stories, share real-time moments, and build meaningful communities on Eternal."
        canonical="/"
        structuredData={{
          type: 'WebSite',
        }}
      />
      {/* Stories Bar */}
      <StoriesBar />

      <CreatePost
        onSubmitFormData={(fd, optimisticPost) =>
          createPost.mutateAsync({ formData: fd, optimisticPost })
        }
        isPending={createPost.isPending}
      />

      {isLoading ? (
        <SkeletonFeed count={10} />
      ) : visiblePosts.length > 0 ? (
        <>
          <div
            ref={containerRef}
            style={{
              height: `${postVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {/* Predictive Viewport Pre-fetching Sentinel: positioned ~3 posts (1440px) above bottom */}
            {visiblePosts.length >= 3 && (
              <div
                ref={sentinelRef}
                data-testid="predictive-prefetch-sentinel"
                style={{
                  position: 'absolute',
                  top: `${Math.max(0, postVirtualizer.getTotalSize() - 1440)}px`,
                  height: '2px',
                  width: '100%',
                  pointerEvents: 'none',
                  visibility: 'hidden',
                }}
              />
            )}
            {virtualItems.map((virtualItem) => {
              const post = visiblePosts[virtualItem.index];
              if (!post) return null;
              return (
                <div
                  key={virtualItem.key}
                  ref={postVirtualizer.measureElement}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start - postVirtualizer.options.scrollMargin}px)`,
                    paddingBottom: '16px',
                  }}
                >
                  <PostCard post={post} queryKey={[FEED_KEY]} />
                </div>
              );
            })}
          </div>

          {isFetchingNextPage && (
            <div className="py-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!hasNextPage && visiblePosts.length > 0 && <AllCaughtUpBanner showCarousel={true} />}
        </>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <p className="text-gray-400 font-semibold text-sm sm:text-base">
              There's nothing here yet...
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Follow interesting creators below to see their posts and updates here.
            </p>
          </div>
          <SuggestedUsersCarousel title="Discover Creators" limit={8} />
        </div>
      )}
    </div>
  );
}
