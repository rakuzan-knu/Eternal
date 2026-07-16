import React from 'react';
import { useFollowMutation } from '../model/useFollowMutation';

export function FollowButton({
  authorId,
  isFollowing,
}: {
  authorId: string;
  isFollowing: boolean;
}) {
  const mutation = useFollowMutation(authorId, isFollowing);

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer disabled:opacity-40 ${
        isFollowing
          ? 'text-gray-400 border-white/[0.08] hover:bg-white/[0.05]'
          : 'text-blue-400 border-blue-400/30 hover:bg-blue-400/10'
      }`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
