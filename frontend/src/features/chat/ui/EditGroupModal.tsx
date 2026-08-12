import React, { useState } from 'react';
import { X, Users, ShieldCheck } from 'lucide-react';
import GroupAvatarCollage from '../../../shared/ui/GroupAvatarCollage';
import Modal from '../../../shared/ui/Modal';
import { ConversationView } from '../../../entities/chat/model/types';
import { useUpdateGroup } from '../model/useConversationMutations';

interface EditGroupModalProps {
  conversation: ConversationView;
  onClose: () => void;
  onOpenParticipants: () => void;
}

export default function EditGroupModal({
  conversation,
  onClose,
  onOpenParticipants,
}: EditGroupModalProps) {
  const [name, setName] = useState(conversation.name ?? '');
  const updateGroup = useUpdateGroup();

  const adminCount = conversation.participants.filter(
    (p) => p.role === 'OWNER' || p.role === 'ADMIN',
  ).length;
  const memberCount = conversation.participants.length;

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => {
        const handleSave = () => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== conversation.name) {
            updateGroup.mutate({ conversationId: conversation.id, name: trimmed });
          }
          close();
        };

        return (
          <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <h2 className="text-lg font-bold text-white">Edit group</h2>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-4 px-5 pb-4">
              <GroupAvatarCollage
                avatars={conversation.participants.map((p) => p.user.avatar)}
                size={64}
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name"
                className="flex-1 h-11 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>

            <div className="px-2 pb-2">
              <button
                onClick={() => {
                  close();
                  onOpenParticipants();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-gray-200 hover:bg-white/5 transition-colors active:scale-[0.99]"
              >
                <ShieldCheck size={17} className="text-gray-400" />
                <span className="flex-1 text-sm font-medium">Admins</span>
                <span className="text-sm text-gray-500">{adminCount}</span>
              </button>
              <button
                onClick={() => {
                  close();
                  onOpenParticipants();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-gray-200 hover:bg-white/5 transition-colors active:scale-[0.99]"
              >
                <Users size={17} className="text-gray-400" />
                <span className="flex-1 text-sm font-medium">Participants</span>
                <span className="text-sm text-gray-500">{memberCount}</span>
              </button>
            </div>

            <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
              <button
                onClick={close}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-gray-300 bg-white/5 hover:bg-white/10 transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white transition-colors active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        );
      }}
    </Modal>
  );
}
