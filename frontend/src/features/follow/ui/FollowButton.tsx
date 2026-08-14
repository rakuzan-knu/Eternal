import React, { useState } from 'react';
import { useFollowMutation } from '../model/useFollowMutation';

interface FollowButtonProps {
  authorId: string;
  isFollowing: boolean;
  className?: string;
}

export function FollowButton({ authorId, isFollowing, className = '' }: FollowButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const mutation = useFollowMutation(authorId, isFollowing);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        mutation.mutate();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={mutation.isPending}
      className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-all cursor-pointer disabled:opacity-40 select-none ${
        isFollowing
          ? isHovered
            ? 'bg-red-500/10 text-red-400 border-red-500/30'
            : 'bg-white/10 text-gray-200 border-white/10 hover:bg-white/15'
          : 'bg-white text-black border-transparent hover:bg-gray-200 shadow-sm'
      } ${className}`}
    >
      {isFollowing ? (isHovered ? 'Unfollow' : 'Following') : 'Follow'}
    </button>
  );
}
