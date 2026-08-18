import React, { useState } from 'react';
import { X, Check, UserX, UserCheck } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import Modal from '../../../shared/ui/Modal';
import { useConversations } from '../model/useConversations';
import { getConversationDisplay } from '../lib/getConversationDisplay';
import { useAuthStore } from '@/shared/model/useAuthStore';
import type { ConversationView } from '../../../entities/chat/model/types';

interface ForwardMessageModalProps {
  messageCount?: number;
  onClose: () => void;
  onForward: (conversationIds: string[], hideAuthor: boolean) => void;
}

export default function ForwardMessageModal({
  messageCount = 1,
  onClose,
  onForward,
}: ForwardMessageModalProps) {
  const { data: conversations } = useConversations();
  const { userId } = useAuthStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hideAuthor, setHideAuthor] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const headerTitle = messageCount > 1 ? `Forward ${messageCount} messages` : 'Forward message';

  return (
    <Modal onClose={onClose} className="w-full max-w-sm max-h-[75vh] flex flex-col">
      {(close) => (
        <div className="bg-[#181a22] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[75vh] backdrop-blur-2xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
            <h2 className="text-base font-bold text-white tracking-tight">{headerTitle}</h2>
            <button
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          {/* Telegram-style "Hide author name" toggle */}
          <div className="px-5 pb-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setHideAuthor((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {hideAuthor ? (
                  <UserX size={16} className="text-rose-400 flex-shrink-0" />
                ) : (
                  <UserCheck size={16} className="text-sky-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-200 leading-tight">
                    {hideAuthor ? 'Sender name hidden' : 'Show sender name'}
                  </p>
                  <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                    {hideAuthor ? 'Forwarded as your message' : 'Author name will be shown'}
                  </p>
                </div>
              </div>
              <div
                className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                  hideAuthor ? 'bg-sky-500 justify-end' : 'bg-white/20 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </div>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 flex flex-col gap-1">
            {conversations?.map((c: ConversationView) => {
              const display = getConversationDisplay(c, userId);
              const isSelected = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`flex items-center gap-3 px-2 py-2 rounded-xl transition-all active:scale-[0.99] ${
                    isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <Avatar size="sm" src={display.avatar} />
                  <span className="flex-1 text-left text-sm text-gray-200 truncate">
                    {display.title}
                  </span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 animate-popIn">
                      <Check size={12} className="text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-5 py-4 flex-shrink-0">
            <button
              disabled={selected.size === 0}
              onClick={() => {
                onForward(Array.from(selected), hideAuthor);
                close();
              }}
              className="w-full py-2.5 rounded-full text-sm font-semibold bg-sky-500 hover:bg-sky-400 disabled:bg-white/10 disabled:text-gray-500 text-white transition-all active:scale-[0.98] shadow-lg shadow-sky-500/20"
            >
              Forward {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
