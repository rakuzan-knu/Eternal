import React, { useState } from 'react';
import { X, Pencil, Check } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import Modal from '../../../shared/ui/Modal';
import { ConversationView } from '../../../entities/chat/model/types';
import { useSetNickname } from '../model/useConversationMutations';

interface NicknamesModalProps {
  conversation: ConversationView;
  onClose: () => void;
}

export default function NicknamesModal({ conversation, onClose }: NicknamesModalProps) {
  const setNickname = useSetNickname();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');

  const startEditing = (userId: string) => {
    setEditingUserId(userId);
    setDraftValue('');
  };

  const confirmEdit = (targetUserId: string) => {
    const trimmed = draftValue.trim();
    if (trimmed) {
      setNickname.mutate({ conversationId: conversation.id, targetUserId, nickname: trimmed });
    }
    setEditingUserId(null);
    setDraftValue('');
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <h2 className="text-lg font-bold text-white">Nicknames</h2>
            <button
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col">
            {conversation.participants.map((participant) => {
              const isEditing = editingUserId === participant.userId;
              const displayName =
                participant.nickname ?? participant.user.displayName ?? participant.user.username;

              return (
                <div
                  key={participant.userId}
                  className="flex items-center gap-3 px-5 py-3 border-t border-white/5"
                >
                  <Avatar size="sm" src={participant.user.avatar} />

                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit(participant.userId);
                          if (e.key === 'Escape') setEditingUserId(null);
                        }}
                        placeholder={displayName}
                        className="flex-1 min-w-0 h-9 px-3 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-all animate-popIn"
                      />
                      <button
                        onClick={() => confirmEdit(participant.userId)}
                        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors active:scale-90"
                      >
                        <Check size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                        <p className="text-xs text-gray-500">Set nickname</p>
                      </div>
                      <button
                        onClick={() => startEditing(participant.userId)}
                        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
                      >
                        <Pencil size={15} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
