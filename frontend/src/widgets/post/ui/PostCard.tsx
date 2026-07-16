import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Repeat, Heart, Share } from 'lucide-react';

import Avatar from '@/shared/ui/Avatar';
import { ExpandableText } from '@/shared/ui/ExpandableText';
import { PostMenu } from '@/features/posts/ui/PostMenu';
import { FollowButton } from '@/features/follow/ui/FollowButton';
import { PollDisplay } from '@/features/posts/ui/PollDisplay';
import { PostMedia } from '@/entities/post/ui/PostMedia';
import { PollVotersModal } from '@/entities/post/ui/PollVotersModal';

import { useUIStore, PostType } from '@/shared/model/useUIStore';
import { useLikeMutation } from '@/features/posts/model/useLikeMutation';
import { formatRelativeTime } from '@/shared/lib/formatRelativeTime';

interface PostCardProps {
  post: PostType;
  queryKey: unknown[];
}

export function PostCard({ post, queryKey }: PostCardProps) {
  const [showVoters, setShowVoters] = useState(false);
  const openCommentModal = useUIStore((state) => state.openCommentModal);
  const likeMutation = useLikeMutation(post.id, !!post.isLiked, queryKey);

  const media = post.media ?? (post.image ? [{ type: 'image' as const, url: post.image }] : []);

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-5 shadow-lg flex flex-col gap-3 transition-all hover:bg-white/[0.03]">
      {post.type === 'repost' && (
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium pl-10">
          <Repeat size={12} /> {post.repostedBy}
        </div>
      )}
      <div className="flex gap-4 items-start">
        <Link to={`/profile/${post.handle}`}>
          <Avatar size="md" src={post.avatar} />
        </Link>
        <div className="flex flex-col flex-1 gap-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to={`/profile/${post.handle}`}
                className="font-bold text-white text-sm truncate hover:underline"
              >
                {post.author}
              </Link>
              <span className="text-xs text-gray-500 shrink-0">
                @{post.handle} • {formatRelativeTime(post.createdAt)}
              </span>
              {!post.isOwner && (
                <FollowButton authorId={post.authorId} isFollowing={!!post.isFollowing} />
              )}
            </div>
            <PostMenu postId={post.id} isOwner={post.isOwner} />
          </div>

          <ExpandableText text={post.text} />
          <PostMedia media={media} />
          {post.poll && (
            <>
              <PollDisplay
                postId={post.id}
                poll={post.poll}
                isOwner={post.isOwner}
                queryKey={queryKey}
              />
              {post.isOwner && (
                <button
                  type="button"
                  onClick={() => setShowVoters(true)}
                  className="text-xs text-gray-500 hover:text-gray-300 self-start"
                >
                  Who voted
                </button>
              )}
              {showVoters && (
                <PollVotersModal
                  postId={post.id}
                  options={post.poll.options}
                  onClose={() => setShowVoters(false)}
                />
              )}
            </>
          )}

          <div className="flex justify-between items-center text-gray-500 text-xs mt-4 max-w-[400px]">
            <button
              onClick={() => openCommentModal(post)}
              className="flex items-center gap-1.5 cursor-pointer hover:text-blue-400 transition-colors"
            >
              <MessageSquare size={16} /> {post.comments ?? 0}
            </button>
            <button
              className={`flex items-center gap-1.5 cursor-pointer hover:text-green-400 ${post.isLiked ? '' : ''}`}
            >
              <Repeat size={16} /> {post.reposts ?? 0}
            </button>
            <button
              onClick={() => likeMutation.mutate()}
              className={`flex items-center gap-1.5 cursor-pointer hover:text-pink-500 ${post.isLiked ? 'text-pink-500' : ''}`}
            >
              <Heart size={16} fill={post.isLiked ? 'currentColor' : 'none'} /> {post.likes ?? 0}
            </button>
            <button className="flex items-center gap-1.5 cursor-pointer hover:text-gray-300">
              <Share size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
