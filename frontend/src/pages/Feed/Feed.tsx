import React, { useRef, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import CreatePost from '../../features/posts/ui/CreatePost';
import { PostCard } from '@/widgets/post/ui/PostCard';
import { SkeletonFeed } from '../../entities/post/ui/SkeletonPostCard';
import { CommentModal } from '@/features/comment/ui/CommentModal';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';
import { usePostsFeed } from '@/entities/post/model/usePostsFeed';
import { useCreatePost } from '@/features/posts/model/useCreatePost';
import { FEED_KEY } from '@/shared/api/queryKeys';
import { AllCaughtUpBanner } from '@/widgets/feed/ui/AllCaughtUpBanner';
import { SuggestedUsersCarousel } from '@/widgets/feed/ui/SuggestedUsersCarousel';

export default function FeedPage() {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = usePostsFeed();
  const createPost = useCreatePost([FEED_KEY]);
  const hiddenIds = useHiddenPostsStore((s) => s.hiddenIds);
  const prefetchQueueRef = useRef<Set<string>>(new Set());

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];
  const visiblePosts = posts.filter((p) => !hiddenIds.has(p.id));

  const handleRangeChanged = (range: { startIndex: number; endIndex: number }) => {
    // Look ahead 2 posts and prefetch image with low priority
    for (let i = range.endIndex + 1; i <= range.endIndex + 3 && i < visiblePosts.length; i++) {
      const post = visiblePosts[i];
      const mediaUrl = post?.media?.[0]?.url || post?.image;
      if (mediaUrl && !prefetchQueueRef.current.has(mediaUrl)) {
        prefetchQueueRef.current.add(mediaUrl);
        const img = new Image();
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';
        img.src = mediaUrl;
      }
    }
  };

  const virtuosoComponents = useMemo(
    () => ({
      Footer: () => {
        if (isFetchingNextPage) {
          return (
            <div className="py-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          );
        }

        if (!hasNextPage && visiblePosts.length > 0) {
          return <AllCaughtUpBanner showCarousel={true} />;
        }

        return <div className="pb-8" />;
      },
    }),
    [isFetchingNextPage, hasNextPage, visiblePosts.length],
  );

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      <CreatePost
        onSubmitFormData={(fd, optimisticPost) =>
          createPost.mutateAsync({ formData: fd, optimisticPost })
        }
        isPending={createPost.isPending}
      />
      <CommentModal />

      {isLoading ? (
        <SkeletonFeed count={10} />
      ) : visiblePosts.length > 0 ? (
        <Virtuoso
          useWindowScroll
          data={visiblePosts}
          components={virtuosoComponents}
          initialItemCount={Math.min(visiblePosts.length, 10)}
          rangeChanged={handleRangeChanged}
          endReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          itemContent={(_index, post) => (
            <div className="pb-4">
              <PostCard key={post.id} post={post} queryKey={[FEED_KEY]} />
            </div>
          )}
        />
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
