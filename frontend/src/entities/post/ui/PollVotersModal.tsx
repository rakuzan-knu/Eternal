import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { usePollVoters, type PollVoterGroup } from '../model/usePollVoters';

interface PollVotersModalProps {
  postId: string | number;
  options: { id: string; text: string }[];
  onClose: () => void;
}

export function PollVotersModal({ postId, options, onClose }: PollVotersModalProps) {
  const { data, isLoading } = usePollVoters(postId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[80vh] flex flex-col bg-[#121215]/95 border border-white/[0.1] rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-purple-400" />
            <h3 className="text-white font-bold text-base">Who voted</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto mt-4 pr-1 space-y-5 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {isLoading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading voters...</p>
          ) : (
            options.map((option) => {
              const voters =
                data?.find((g: PollVoterGroup) => g.optionId === option.id)?.voters ?? [];
              return (
                <div
                  key={option.id}
                  className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3.5"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-sm font-semibold text-gray-200 truncate pr-2">
                      {option.text}
                    </p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                      {voters.length} {voters.length === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>
                  {voters.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-1">No one voted yet..</p>
                  ) : (
                    <div className="flex flex-col gap-2 pt-1">
                      {voters.map((v: PollVoterGroup['voters'][number]) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-white/[0.04] transition-colors"
                        >
                          <Avatar size="sm" src={v.avatar} />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm text-gray-200 font-medium truncate">
                              {v.displayName || v.username}
                            </span>
                            <span className="text-xs text-gray-500 truncate">@{v.username}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}
