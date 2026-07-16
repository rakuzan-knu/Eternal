import React from 'react';
import CreatePost from '../../features/posts/ui/CreatePost';
import { PostCard } from '@/widgets/post/ui/PostCard';
import { SkeletonFeed } from '../../entities/post/ui/SkeletonPostCard';
import { CommentModal } from '@/features/comment/ui/CommentModal';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';
import { usePostsFeed } from '@/entities/post/model/usePostsFeed';
import { useCreatePost } from '@/features/posts/model/useCreatePost';
import { FEED_KEY } from '@/shared/api/queryKeys';

export default function FeedPage() {
  const { data, isLoading } = usePostsFeed();
  const createPost = useCreatePost([FEED_KEY]);
  const hiddenIds = useHiddenPostsStore((s) => s.hiddenIds);

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];
  const visiblePosts = posts.filter((p) => !hiddenIds.has(p.id));

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      <CreatePost onSubmitFormData={(fd) => createPost.mutate(fd)} />
      <CommentModal />

      {isLoading ? (
        <SkeletonFeed count={10} />
      ) : visiblePosts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} queryKey={[FEED_KEY]} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
          <p className="text-gray-500 font-medium text-base">There's nothing here yet...</p>
          <p className="text-xs text-gray-600 mt-1">The feed page of our platform.</p>
        </div>
      )}
    </div>
  );
}
