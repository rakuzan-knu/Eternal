import React, { useState } from 'react';
import { Check, BarChart2 } from 'lucide-react';
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
  const [justVotedId, setJustVotedId] = useState<string | null>(null);
  const hasVoted = poll.myVoteOptionId !== null || justVotedId !== null;
  const showResults = hasVoted || !!isOwner;

  const handleVote = (optionId: string) => {
    if (voteMutation.isPending || hasVoted) return;
    setJustVotedId(optionId);
    voteMutation.mutate(optionId);
  };

  return (
    <div className="flex flex-col gap-2 mt-3 w-full max-w-lg rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3.5 backdrop-blur-sm shadow-inner">
      <div className="flex items-center justify-between text-xs text-gray-400 font-medium px-1 mb-1">
        <span className="flex items-center gap-1.5 text-gray-300 font-semibold">
          <BarChart2 size={14} className="text-purple-400" />
          Poll
        </span>
        <span className="text-[11px] text-gray-500">
          {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const isMine = option.id === poll.myVoteOptionId || option.id === justVotedId;
          const votesCount = option.votes ?? option.votesCount ?? 0;
          const percentage =
            poll.totalVotes > 0 ? Math.round((votesCount / poll.totalVotes) * 100) : 0;

          if (!showResults) {
            return (
              <button
                key={option.id}
                type="button"
                disabled={voteMutation.isPending}
                onClick={() => handleVote(option.id)}
                className="group relative flex items-center justify-between w-full text-left text-sm font-medium text-white bg-white/[0.04] hover:bg-white/[0.08] hover:border-purple-500/30 border border-white/[0.08] rounded-xl px-4 py-3 transition-all duration-200 active:scale-[0.99] cursor-pointer"
              >
                <span className="flex-1 pr-3 truncate">{option.text}</span>
                <span className="w-4 h-4 rounded-full border-2 border-white/20 group-hover:border-purple-400 flex items-center justify-center transition-colors shrink-0" />
              </button>
            );
          }

          return (
            <div
              key={option.id}
              onClick={() => {
                if (!hasVoted) handleVote(option.id);
              }}
              className={`relative overflow-hidden rounded-xl border transition-all duration-300 p-3 flex flex-col justify-center select-none ${
                hasVoted ? 'cursor-default' : 'cursor-pointer hover:bg-white/[0.04]'
              } ${
                isMine
                  ? 'border-purple-500/40 bg-purple-950/20 shadow-sm'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              {/* Animated Progress Bar */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
                  isMine
                    ? 'bg-gradient-to-r from-purple-600/35 via-violet-600/35 to-indigo-600/25 border-r border-purple-500/40'
                    : 'bg-white/[0.05] border-r border-white/10'
                }`}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative z-10 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isMine && (
                    <span className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 animate-popIn shadow-sm">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                  <span
                    className={`truncate font-medium ${
                      isMine ? 'text-purple-200 font-semibold' : 'text-gray-200'
                    }`}
                  >
                    {option.text}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-400 font-normal">{votesCount}</span>
                  <span
                    className={`text-xs font-bold transition-all duration-500 tabular-nums ${
                      isMine ? 'text-purple-300' : 'text-gray-300'
                    }`}
                  >
                    {percentage}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
