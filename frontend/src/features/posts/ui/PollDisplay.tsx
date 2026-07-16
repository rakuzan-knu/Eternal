import React from 'react';
import { useVotePollMutation } from '../model/useVotePollMutation';
import { PollData } from '@/entities/post/model/types';

export function PollDisplay({
  postId,
  poll,
  isOwner,
  queryKey,
}: {
  postId: string | number;
  poll: PollData;
  isOwner?: boolean;
  queryKey: unknown[];
}) {
  const voteMutation = useVotePollMutation(postId, queryKey);
  const showResults = poll.myVoteOptionId !== null || !!isOwner;

  return (
    <div className="flex flex-col gap-2 mt-2 w-full max-w-sm">
      {poll.options.map((option) => {
        const percentage =
          poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
        const isMine = option.id === poll.myVoteOptionId;

        if (!showResults) {
          return (
            <button
              key={option.id}
              type="button"
              disabled={voteMutation.isPending}
              onClick={() => voteMutation.mutate(option.id)}
              className="text-left text-sm text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
            >
              {option.text}
            </button>
          );
        }

        return (
          <div
            key={option.id}
            className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5"
          >
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ${isMine ? 'bg-purple-500/30' : 'bg-white/[0.06]'}`}
              style={{ width: `${percentage}%` }}
            />
            <div className="relative flex items-center justify-between text-sm">
              <span className={`font-medium ${isMine ? 'text-purple-300' : 'text-gray-200'}`}>
                {option.text}
                {isMine && ' ✓'}
              </span>
              <span className="text-gray-400 text-xs font-semibold">{percentage}%</span>
            </div>
          </div>
        );
      })}
      <span className="text-xs text-gray-500 mt-0.5">
        {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}
      </span>
    </div>
  );
}
