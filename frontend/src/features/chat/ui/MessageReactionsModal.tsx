import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import Modal from '../../../shared/ui/Modal';
import { ReactionSummary } from '../../../entities/chat/model/types';

interface MessageReactionsModalProps {
  reactions: ReactionSummary[];
  currentUserId: string | null;
  onClose: () => void;
  onRemoveOwn: (emoji: string) => void;
}

export default function MessageReactionsModal({
  reactions,
  currentUserId,
  onClose,
  onRemoveOwn,
}: MessageReactionsModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | string>('all');

  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

  const rows = useMemo(() => {
    const source = activeTab === 'all' ? reactions : reactions.filter((r) => r.emoji === activeTab);
    return source.flatMap((r) => r.users.map((user) => ({ user, emoji: r.emoji })));
  }, [reactions, activeTab]);

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-base font-bold text-white">Message reactions</h2>
            <button
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1 px-3 border-b border-white/10 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'text-white border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              All {totalCount}
            </button>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => setActiveTab(r.emoji)}
                className={`px-3 py-2.5 text-sm font-semibold whitespace-nowrap flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === r.emoji
                    ? 'text-white border-blue-400'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>

          <div className="max-h-72 overflow-y-auto custom-scrollbar px-2 py-2">
            {rows.map(({ user, emoji }, index) => {
              const isSelf = user.id === currentUserId;
              return (
                <div
                  key={`${user.id}-${emoji}-${index}`}
                  style={{ animationDelay: `${Math.min(index, 8) * 20}ms` }}
                  className="animate-fadeIn flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Avatar size="sm" src={user.avatar} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user.displayName ?? user.username}
                    </p>
                    {isSelf && (
                      <button
                        onClick={() => onRemoveOwn(emoji)}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Click to remove
                      </button>
                    )}
                  </div>
                  <span className="text-lg flex-shrink-0">{emoji}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
