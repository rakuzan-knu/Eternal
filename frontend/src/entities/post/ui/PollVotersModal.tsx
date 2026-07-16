import React from 'react';
import { X } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { usePollVoters } from '../model/usePollVoters';

interface PollVotersModalProps {
  postId: string | number;
  options: { id: string; text: string }[];
  onClose: () => void;
}

export function PollVotersModal({ postId, options, onClose }: PollVotersModalProps) {
  const { data, isLoading } = usePollVoters(postId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[70vh] overflow-y-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">Who voted</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-sm text-center py-6">Loading...</p>
        ) : (
          options.map((option) => {
            const voters = data?.find((g) => g.optionId === option.id)?.voters ?? [];
            return (
              <div key={option.id} className="mb-4">
                <p className="text-sm font-semibold text-gray-300 mb-2">
                  {option.text} <span className="text-gray-500 font-normal">({voters.length})</span>
                </p>
                {voters.length === 0 ? (
                  <p className="text-xs text-gray-600">No one voted yet..</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {voters.map((v) => (
                      <div key={v.id} className="flex items-center gap-2.5">
                        <Avatar size="sm" src={v.avatar} />
                        <span className="text-sm text-gray-200">{v.displayName || v.username}</span>
                        <span className="text-xs text-gray-500">@{v.username}</span>
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
  );
}
