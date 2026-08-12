import React from 'react';
import { X, Crown, ShieldCheck } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import Modal from '../../../shared/ui/Modal';
import { ConversationView } from '../../../entities/chat/model/types';

interface GroupParticipantsModalProps {
  conversation: ConversationView;
  currentUserId: string | null;
  onClose: () => void;
  onSelectMember: (userId: string) => void;
}

export default function GroupParticipantsModal({
  conversation,
  currentUserId,
  onClose,
  onSelectMember,
}: GroupParticipantsModalProps) {
  return (
    <Modal onClose={onClose} className="w-full max-w-sm max-h-[70vh] flex flex-col">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[70vh]">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
            <h2 className="text-lg font-bold text-white">
              {conversation.participants.length} participants
            </h2>
            <button
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3">
            {conversation.participants.map((p, index) => {
              const name = p.nickname ?? p.user.displayName ?? p.user.username;
              const isSelf = p.userId === currentUserId;

              return (
                <button
                  key={p.userId}
                  style={{ animationDelay: `${Math.min(index, 8) * 20}ms` }}
                  onClick={() => {
                    close();
                    onSelectMember(p.userId);
                  }}
                  className="animate-fadeIn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all active:scale-[0.99] text-left"
                >
                  <div className="relative">
                    <Avatar size="sm" src={p.user.avatar} />
                    <OnlineStatusIndicator userId={p.userId} variant="dot" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {name}
                      {isSelf && <span className="text-gray-500 font-normal"> (you)</span>}
                    </p>
                    {(p.role === 'OWNER' || p.role === 'ADMIN') && (
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        {p.role === 'OWNER' ? (
                          <Crown size={11} className="text-yellow-500" />
                        ) : (
                          <ShieldCheck size={11} className="text-blue-400" />
                        )}
                        {p.role === 'OWNER' ? 'Owner' : 'Admin'}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
