import React, { useMemo } from 'react';
import { BarChart2, Check } from 'lucide-react';
import { useChatPollVotesStore } from '../model/useChatPollVotesStore';
import type { ChatPollData } from '../lib/chatPoll';

interface ChatPollCardProps {
  messageId: string;
  poll: ChatPollData;
  isOwnMessage: boolean;
}

export default function ChatPollCard({ messageId, poll }: ChatPollCardProps) {
  const myVoteOptionId = useChatPollVotesStore((s) => s.getVote(messageId));
  const setVote = useChatPollVotesStore((s) => s.setVote);

  const hasVoted = Boolean(myVoteOptionId);

  // Compute vote counts based on options and local vote
  const { totalVotes, optionStats } = useMemo(() => {
    const stats = poll.options.map((opt) => {
      let count = opt.votes || 0;
      if (myVoteOptionId === opt.id) {
        count += 1;
      }
      return { ...opt, count };
    });

    const total = stats.reduce((acc, curr) => acc + curr.count, 0);

    return {
      totalVotes: total,
      optionStats: stats.map((opt) => ({
        ...opt,
        percentage: total > 0 ? Math.round((opt.count / total) * 100) : 0,
      })),
    };
  }, [poll.options, myVoteOptionId]);

  const handleVote = (optionId: string) => {
    if (hasVoted) return;
    setVote(messageId, optionId);
  };

  return (
    <div className="w-full min-w-[240px] max-w-[340px] rounded-2xl bg-black/20 border border-white/10 backdrop-blur-xl p-3.5 flex flex-col gap-2.5 select-none shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <BarChart2 size={15} className="text-purple-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
            Poll
          </span>
        </div>
        <span className="text-[11px] text-gray-400 tabular-nums">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-white leading-snug tracking-tight">
        {poll.question}
      </h4>

      <div className="flex flex-col gap-2 mt-1">
        {optionStats.map((opt) => {
          const isSelected = myVoteOptionId === opt.id;

          if (!hasVoted) {
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleVote(opt.id)}
                className="group relative flex items-center justify-between w-full text-left text-xs font-medium text-gray-100 bg-white/5 hover:bg-purple-500/15 hover:border-purple-400/40 border border-white/10 rounded-xl px-3.5 py-2.5 transition-all active:scale-[0.99] cursor-pointer"
              >
                <span className="flex-1 pr-2 truncate">{opt.text}</span>
                <span className="w-4 h-4 rounded-full border border-white/30 group-hover:border-purple-400 flex items-center justify-center transition-colors shrink-0" />
              </button>
            );
          }

          return (
            <div
              key={opt.id}
              className={`relative overflow-hidden rounded-xl border transition-all p-2.5 flex flex-col justify-center ${
                isSelected
                  ? 'border-purple-500/50 bg-purple-900/20 shadow-md'
                  : 'border-white/5 bg-white/[0.03]'
              }`}
            >
              {/* Progress fill bar */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600/35 via-violet-600/35 to-indigo-600/25 border-r border-purple-400/40'
                    : 'bg-white/[0.06] border-r border-white/10'
                }`}
                style={{ width: `${opt.percentage}%` }}
              />

              <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isSelected && (
                    <span className="w-3.5 h-3.5 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 animate-popIn">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                  <span
                    className={`truncate font-medium ${
                      isSelected ? 'text-purple-200 font-semibold' : 'text-gray-200'
                    }`}
                  >
                    {opt.text}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                  <span className="text-[10px] text-gray-400">{opt.count}</span>
                  <span
                    className={`font-bold text-[11px] ${
                      isSelected ? 'text-purple-300' : 'text-gray-300'
                    }`}
                  >
                    {opt.percentage}%
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
