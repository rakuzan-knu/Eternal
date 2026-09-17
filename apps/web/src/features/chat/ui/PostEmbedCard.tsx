import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Layers, MessageSquare, Heart } from 'lucide-react';
import { postsApi } from '@/entities/post/api/postsApi';
import Avatar from '@/shared/ui/Avatar';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import { UserBadgeIcon } from '@/entities/profile/ui/UserBadgeIcon';

interface PostEmbedCardProps {
  postId: string;
  isOwnMessage?: boolean;
}

export function PostEmbedCard({ postId, isOwnMessage }: PostEmbedCardProps) {
  const navigate = useNavigate();

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['post-embed', postId],
    queryFn: () => postsApi.getPostById(postId),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  if (isError || (!isLoading && !post)) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        className={`mt-2 p-3 rounded-2xl border animate-pulse flex flex-col gap-2 ${
          isOwnMessage ? 'bg-black/10 border-black/10' : 'bg-white/[0.04] border-white/10'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/10" />
          <div className="w-24 h-3 bg-white/10 rounded" />
        </div>
        <div className="w-full h-10 bg-white/10 rounded-xl" />
      </div>
    );
  }

  if (!post) return null;

  const firstMedia = post.media?.[0]?.url || post.image;
  const targetUrl = `/profile/${post.handle}#post-${post.id}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(targetUrl);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      className={`mt-2 w-full max-w-[320px] rounded-2xl p-3 border transition-all duration-200 cursor-pointer text-left select-none group ${
        isOwnMessage
          ? 'bg-black/5 hover:bg-black/10 border-black/15 text-black'
          : 'bg-[#121216]/90 hover:bg-[#16161c] border-white/10 hover:border-white/20 text-white shadow-lg'
      }`}
    >
      {/* Author Bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar size="sm" src={post.avatar} />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span
                className={`text-[12px] font-bold truncate leading-tight ${
                  isOwnMessage ? 'text-black' : 'text-white'
                }`}
              >
                {post.author}
              </span>
              {post.isVerified && <VerifiedCheckmark size="sm" />}
              {post.primaryBadge && <UserBadgeIcon badgeId={post.primaryBadge} size="sm" />}
            </div>
            <span
              className={`text-[10px] truncate leading-tight ${
                isOwnMessage ? 'text-black/60' : 'text-gray-400'
              }`}
            >
              @{post.handle}
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Post</span>
          <ExternalLink size={11} />
        </div>
      </div>

      {/* Media Thumbnail */}
      {firstMedia && (
        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-2 bg-black/20 border border-white/5">
          <img
            src={firstMedia}
            alt="Post preview"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {post.media && post.media.length > 1 && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[9px] flex items-center gap-1">
              <Layers size={10} />
              <span>+{post.media.length - 1}</span>
            </div>
          )}
        </div>
      )}

      {/* Post Text */}
      {post.text && (
        <p
          className={`text-[12px] line-clamp-2 leading-relaxed mb-2 ${
            isOwnMessage ? 'text-black/80' : 'text-gray-300'
          }`}
        >
          {post.text}
        </p>
      )}

      {/* Footer info stats */}
      <div
        className={`flex items-center gap-3 text-[10px] pt-1 border-t ${
          isOwnMessage ? 'border-black/10 text-black/60' : 'border-white/[0.06] text-gray-500'
        }`}
      >
        <span className="flex items-center gap-1">
          <Heart size={10} /> {post.likes ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare size={10} /> {post.comments ?? 0}
        </span>
      </div>
    </div>
  );
}
