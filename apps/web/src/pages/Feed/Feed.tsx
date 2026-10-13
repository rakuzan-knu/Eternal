import React from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import CreatePost from '../../features/posts/ui/CreatePost';
import { StoriesBar } from '@/widgets/feed/ui/StoriesBar';
import { BoundedPostList } from '@/widgets/post/ui/BoundedPostList';
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
  const feedQuery = usePostsFeed();
  const { data, isLoading, hasNextPage, isFetchingNextPage } = feedQuery;
  const createPost = useCreatePost([FEED_KEY]);
  const hiddenIds = useHiddenPostsStore((s) => s.hiddenIds);

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];
  const visiblePosts = posts.filter((p) => !hiddenIds.has(p.id));

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
          <BoundedPostList
            posts={posts}
            query={feedQuery}
            queryKey={[FEED_KEY]}
            includePost={(post) => !hiddenIds.has(post.id)}
          />

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
