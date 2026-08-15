import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import Modal from '../../../shared/ui/Modal';
import { useConversations } from '../model/useConversations';
import { getConversationDisplay } from '../lib/getConversationDisplay';
import { useAuthStore } from '@/shared/model/useAuthStore';

import type { ConversationView } from '../../../entities/chat/model/types';

interface ForwardMessageModalProps {
  onClose: () => void;
  onForward: (conversationIds: string[]) => void;
}

export default function ForwardMessageModal({ onClose, onForward }: ForwardMessageModalProps) {
  const { data: conversations } = useConversations();
  const { userId } = useAuthStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  return (
    <Modal onClose={onClose} className="w-full max-w-sm max-h-[70vh] flex flex-col">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[70vh]">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
            <h2 className="text-base font-bold text-white">Forward message</h2>
            <button
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
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
                    <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 animate-popIn">
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
                onForward(Array.from(selected));
                close();
              }}
              className="w-full py-2.5 rounded-full text-sm font-semibold bg-blue-500 hover:bg-blue-400 disabled:bg-white/10 disabled:text-gray-500 text-white transition-all active:scale-[0.98]"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
